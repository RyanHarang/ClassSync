chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchCanvasEvents") {
    const { canvasToken, startDate } = request;
    const url = `https://www.instructure.com/api/v1/calendar_events?start_date=${startDate}`;

    fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${canvasToken}`,
      },
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw new Error("Network response was not ok");
      })
      .then((data) => {
        sendResponse({ events: data });
      })
      .catch((error) => {
        console.error("Fetch error:", error);
        sendResponse({ error: error.message });
      });

    // Return true to indicate you want to send a response asynchronously
    return true;
  }
});
