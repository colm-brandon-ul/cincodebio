function formatServiceName(service) {
  return service
      .split('_') // Split the string on underscores
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each substring
      .join(' '); // Join the substrings with a space
}

const createLoadingModal = (service) => {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 9vh;
    left: 0;
    width: 100%;
    height: 91vh;
    background-color: rgba(0, 0, 0, 0.5);
    display: none;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    background-color: white;
    padding: 2rem;
    border-radius: 8px;
    text-align: center;
  `;

  const spinner = document.createElement('div');
  spinner.style.cssText = `
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    margin: 0 auto 1rem auto;
    animation: spin 1s linear infinite;
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;

  const text = document.createElement('p');
  text.textContent = `${formatServiceName(service)} is starting...`;

  content.appendChild(spinner);
  content.appendChild(text);
  modal.appendChild(content);
  document.head.appendChild(style);
  document.body.appendChild(modal);

  return modal;
};
  
  const checkHealth = (websocketUrl, service, checkInterval = 500) => {
    const modal = createLoadingModal(service);
    let websocket = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 3;
    const showModalDelay = 100; // Delay before showing the modal
    let closed_healthy = false;
    let reconnect_error = false;
    
    const showModal = () => {
      modal.style.display = 'flex';
    };
  
    const hideModal = () => {
      modal.style.display = 'none';
    };
  
    const connect = () => {
      if (reconnectAttempts >= maxReconnectAttempts) {
        if (reconnect_error == false) {
          alert('Failed to connect to Healthcheck server, please refresh');
          reconnect_error = true;
        }
        hideModal();
        return;
      }
      
      websocket = new WebSocket(websocketUrl);
      console.log('Attempting to connect to WebSocket server...');
  
      websocket.onopen = () => {
        console.log('WebSocket connection established');
        reconnectAttempts = 0;
        // Send initial health check
        websocket.send(JSON.stringify({ service: service }));
        setTimeout(showModal, showModalDelay);
      };
  
      websocket.onmessage = (event) => {
        const response = JSON.parse(event.data);
        console.log('Received health check response:', response);
        if (response.status === 'healthy') {
          hideModal(); // Close the connection after health check
          closed_healthy = true;
          modal.parentNode.removeChild(modal); // Remove the modal from the DOM
          websocket.close(); 
        }
      };
  
      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        reconnectAttempts++;
        if (closed_healthy == false) {
        setTimeout(connect, 1000); // Attempt to reconnect after 1 second
        }
      };
  
      websocket.onclose = () => {
        console.log('WebSocket connection closed');
        reconnectAttempts++;
        if (closed_healthy == false) {
          setTimeout(connect, 1000); // Attempt to reconnect after 1 second
          }
      };
    };
  
    // Start the initial connection
    console.log('Connecting to WebSocket server...');
    connect();
  
    // Set up periodic health checks
    const intervalId = setInterval(() => {
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({ service: service  }));
      }
    }, checkInterval);
  
    // Return cleanup function
    return () => {
      clearInterval(intervalId);
      if (websocket) {
        websocket.close();
      }
      if (modal && modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    };
  };
