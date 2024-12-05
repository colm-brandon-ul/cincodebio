// auth_redirect.html
document.addEventListener("DOMContentLoaded", function () {
    // Retrieve the token from localStorage
    const token = localStorage.getItem('cinco_cloud_token');
    if (!token) {
        alert("No token found. Please log in.");
        window.location.href = "/login"; // Redirect to login if no token
        return;
    }

    // Get the original URL from query parameters
    const params = new URLSearchParams(window.location.search);
    const originalUrl = params.get('next');
    if (!originalUrl) {
        alert("No target URL specified.");
        return;
    }

    // Add the Authorization header and resend the request
    fetch(originalUrl, {
        method: "GET", // Adjust method as needed
        headers: {
            "Authorization": `Bearer ${token}`
        }
    })
    .then(response => {
        if (response.ok) {
            return response.text();
        } else {
            throw new Error("Request failed");
        }
    })
    .then(html => {
        // Replace current page content with fetched HTML
        document.open();
        document.write(html);
        document.close();
    })
    .catch(error => {
        console.error("Error:", error);
        alert("Failed to load content.");
    });
});

