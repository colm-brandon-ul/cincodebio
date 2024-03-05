# Job Management Imports
import pika
from pika.exchange_type import ExchangeType
import threading
import functools

import requests 
import json
import logging 
import time 
import os

# K8s Service Discovery (ENV Variables)
# my-service -> MY_SERVICE_SERVICE_HOST, MY_SERVICE_SERVICE_PORT

# Import Environment Variables
EXECUTION_ADDRESS = f'http://{os.environ.get("EXECUTION_ENVIRONMENT_SERVICE_HOST")}:{os.environ.get("EXECUTION_ENVIRONMENT_SERVICE_PORT")}'
EXECUTION_API_ADDRESS = f'http://{os.environ.get("EXECUTION_API_SERVICE_HOST")}:{os.environ.get("EXECUTION_API_SERVICE_PORT")}'

# RabbitMQ ENV Variables
RABBIT_MQ_HOST = os.environ.get('RABBITMQ_SERVICE_HOST')
RABBIT_MQ_PORT = os.environ.get('RABBITMQ_SERVICE_PORT')

EXCHANGE_NAME = os.environ.get('CODE_GENERATOR_EXCHANGE_NAME')
EXCHANGE_TYPE = ExchangeType.direct
CODE_GEN_ROUTING_KEY = os.environ.get('CODE_GENERATOR_ROUTING_KEY')

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
    logging.warning(payload["workflow_id"])
    logging.warning(payload["model"])
    
    res = requests.post(f"http://{EXECUTION_API_ADDRESS}/control/update-workflow/{payload['workflow_id']}", json={"status": "accepted"})

    # This will be replaced with some code generatioon functionality
    res = requests.post(f"http://{EXECUTION_ADDRESS}/", 
                        json={"code": payload["model"].replace("WORKFLOW_ID", payload["workflow_id"]), 
                              "workflow_id": payload["workflow_id"]})
    logging.warning(str(res.status_code))

    # For acknowledging the message from the main loop
    cb = functools.partial(ack_message, ch, method_frame.delivery_tag)
    ch.connection.add_callback_threadsafe(cb)


def main():
    threads = []
    connection_params = pika.ConnectionParameters(host=RABBIT_MQ_HOST,port=RABBIT_MQ_PORT)
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