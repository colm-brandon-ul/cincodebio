from codegen.main import HippoFlowCodegenrator
from config import (EXECUTION_API_ADDRESS, EXECUTION_ENV_LB, SIB_MANAGER_ADDRESS, 
                    RABBIT_MQ_HOST, RABBIT_MQ_PORT, EXCHANGE_NAME, EXCHANGE_TYPE, 
                    CODE_GEN_ROUTING_KEY, RABBITMQ_USERNAME, RABBITMQ_PASSWORD,CINCO_DE_BIO_NAMESPACE)

# Job Management Imports
import pika
import threading
import functools

import requests 
import json
import logging 
import time 



# K8s Service Discovery (ENV Variables)
# my-service -> MY_SERVICE_SERVICE_HOST, MY_SERVICE_SERVICE_PORT

def ack_message(ch, delivery_tag):
    """Note that `ch` must be the same pika channel instance via which
    the message being ACKed was retrieved (AMQP protocol constraint).
    """
    if ch.is_open:
        ch.basic_ack(delivery_tag)
    else:
        # Channel is already closed, so we can't ACK this message;
        # log and/or do something that makes sense for your app in this case.
        pass

def on_message(channel, method_frame, header_frame, body, thread_list):
    t = threading.Thread(target=do_work, args=(channel, method_frame, body))
    t.start()
    thread_list.append(t)
    
def mark_workflow_failed(workflow_id: str, reason: str):
    """Surface a code-generation / dispatch failure on the workflow page instead of
    leaving it stuck at 'submitted' forever. Best-effort: never raises."""
    logging.error(f"Workflow {workflow_id} failed in code-generator: {reason}")
    try:
        requests.post(
            f"{EXECUTION_API_ADDRESS}/control/update-workflow/{workflow_id}",
            json={"status": "failed"},
            timeout=15,
        )
    except Exception:
        logging.exception(f"Could not mark workflow {workflow_id} as failed")


# Launched in a new thread
def do_work(ch, method_frame, body):
    thread_id = threading.get_ident()
    payload = json.loads(body)
    workflow_id = payload.get("workflow_id")

    logging.warning(f" Number of Threads: {threading.active_count()}, Thread id: {thread_id}")

    # Code generator and dispatch — wrapped so any failure is reported on the
    # workflow page (status='failed') with a logged traceback, rather than the
    # thread dying silently and the workflow staying 'submitted' with no jobs.
    try:
        # Code generator and dispatch
        logging.warning(payload)
        if "v2" in payload:
            v2 = True
        else:
            v2 = False

        res = requests.get(f"{SIB_MANAGER_ADDRESS}/get-sib-map")
        res.raise_for_status()

        sib_map = json.loads(res.content.decode("utf-8"))
        logging.warning(sib_map)

        executable = HippoFlowCodegenrator.generate(
            model = payload["model"],
            workflow_id=workflow_id,
            sib_mapping=sib_map,
            cdb_external_url=payload["external_url"],
            v2=v2
        )

        logging.warning(f'WORKFLOW CODE: \n{executable}')

        # Dispatch the generated workflow code to the execution environment.
        res = requests.post(f"http://{EXECUTION_ENV_LB}.{CINCO_DE_BIO_NAMESPACE}.svc.cluster.local/",
                            json={"code": executable, "workflow_id": workflow_id})

        if res.status_code == 202:
            res = requests.post(f"{EXECUTION_API_ADDRESS}/control/update-workflow/{workflow_id}", json={"status": "accepted"})
            logging.info(str(res.status_code))
        else:
            mark_workflow_failed(
                workflow_id,
                f"execution-environment returned HTTP {res.status_code}: {res.text[:500]}",
            )
    except Exception as exc:
        logging.exception(f"Code generation/dispatch failed for workflow {workflow_id}")
        if workflow_id:
            mark_workflow_failed(workflow_id, repr(exc))
    finally:
        # Always acknowledge the message so it is not redelivered in a loop.
        cb = functools.partial(ack_message, ch, method_frame.delivery_tag)
        ch.connection.add_callback_threadsafe(cb)


def main():
    threads = []
    credentials = pika.PlainCredentials(RABBITMQ_USERNAME, RABBITMQ_PASSWORD)
    connection_params = pika.ConnectionParameters(host=RABBIT_MQ_HOST,port=RABBIT_MQ_PORT, credentials=credentials)
    for i in range(20):
        try:
            connection = pika.BlockingConnection(connection_params)
            break
        except:
            time.sleep(5)
    
    #Initialise Queue 
    channel = connection.channel()
    
    channel.exchange_declare(exchange=EXCHANGE_NAME, exchange_type=EXCHANGE_TYPE)
    result = channel.queue_declare('', exclusive=True)
    queue_name = result.method.queue
    channel.queue_bind(queue=queue_name, exchange=EXCHANGE_NAME, routing_key=CODE_GEN_ROUTING_KEY)
    
    on_message_callback = functools.partial(on_message, thread_list=(threads))
    # Limits the number of threads
    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(
        queue=queue_name, 
        on_message_callback=on_message_callback)
    try:
        channel.start_consuming()
    except KeyboardInterrupt:
        channel.close()


if __name__ == "__main__":
    logging.warning('Ive STARTED')
    main()
    logging.warning('Changed')