chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchCanvasEvents") {
    const { canvasToken } = request;

    // Fetch user -> courses -> assignments
    const fetchUserAndCourses = async () => {
      try {
        // Fetch user ID
        const userResponse = await fetch(
          "https://wwu.instructure.com/api/v1/users/self",
          {
            method: "GET",
            headers: { Authorization: `Bearer ${canvasToken}` },
          }
        );

        if (!userResponse.ok) throw new Error("Failed to fetch user ID");

        const userData = await userResponse.json();
        const userId = `user_${userData.id}`;

        // Fetch courses
        const coursesResponse = await fetch(
          "https://wwu.instructure.com/api/v1/courses?enrollment_state=active",
          {
            method: "GET",
            headers: { Authorization: `Bearer ${canvasToken}` },
          }
        );

        if (!coursesResponse.ok) throw new Error("Failed to fetch courses");

        const coursesData = await coursesResponse.json();
        const courseIds = coursesData.map((course) => `course_${course.id}`);

        const startDate = new Date().toISOString();
        const endDate = new Date(
          new Date().setMonth(new Date().getMonth() + 3)
        ).toISOString();

        // Generate final calendar events URL
        const url = new URL(
          "https://wwu.instructure.com/api/v1/calendar_events"
        );
        [userId, ...courseIds].forEach((id) =>
          url.searchParams.append("context_codes[]", id)
        );
        url.searchParams.append("start_date", startDate);
        url.searchParams.append("end_date", endDate);
        url.searchParams.append("type", "assignment");
        // probably need a seperate request to get events?

        return url;
      } catch (error) {
        console.error("Error fetching user or courses:", error);
        throw error;
      }
    };

    // Fetch events using generated URL
    fetchUserAndCourses()
      .then((url) => {
        return fetch(url, {
          method: "GET",
          headers: { Authorization: `Bearer ${canvasToken}` },
        });
      })
      .then((response) => {
        if (response.ok) return response.json();
        throw new Error("Failed to fetch calendar events");
      })
      .then((data) => {
        sendResponse({ events: data });
      })
      .catch((error) => {
        console.error("Fetch error:", error);
        sendResponse({ error: error.message });
      });

    return true;
  }
});
