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
    
# Launched in a new thread
def do_work(ch, method_frame, body):
    thread_id = threading.get_ident()
    payload = json.loads(body)
    
    logging.warning(f" Number of Threads: {threading.active_count()}, Thread id: {thread_id}")
    
    # Code generator and dispatch 
    logging.warning(payload)
    if "v2" in payload:
        v2 = True
    else:
        v2 = False

    res = requests.get(f"{SIB_MANAGER_ADDRESS}/get-sib-map")

    sib_map = json.loads(res.content.decode("utf-8"))
    logging.warning(sib_map)

    executable = HippoFlowCodegenrator.generate(
        model = payload["model"],
        workflow_id=payload["workflow_id"],
        sib_mapping=sib_map,
        cdb_external_url=payload["external_url"],
        v2=v2
        
    )

    logging.warning(f'WORKFLOW CODE: \n{executable}')
    

    # This will be replaced with some code generatioon functionality
    
    res = requests.post(f"http://{EXECUTION_ENV_LB}.{CINCO_DE_BIO_NAMESPACE}.svc.cluster.local/", 
                        json={"code": executable, "workflow_id": payload["workflow_id"]})

    if res.status_code == 202:
        res = requests.post(f"{EXECUTION_API_ADDRESS}/control/update-workflow/{payload['workflow_id']}", json={"status": "accepted"})

    # logging.warning(str(res.status_code))

    # For acknowledging the message from the main loop
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