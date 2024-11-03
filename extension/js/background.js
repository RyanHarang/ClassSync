chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchCanvasEvents") {
    const { canvasToken } = request;
    // Create URL object for easier parameter handling
    const url = new URL("https://wwu.instructure.com/api/v1/calendar_events");

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0];

    // Get date 3 months from today for end_date
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3);
    const endDateStr = endDate.toISOString().split("T")[0];

    // Add query parameters
    // url.searchParams.append("type", "event");
    url.searchParams.append("start_date", today);
    url.searchParams.append("end_date", endDateStr);
    // url.searchParams.append("per_page", "50");

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
