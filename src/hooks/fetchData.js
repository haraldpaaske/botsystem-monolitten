const fetchData = async (url, method = "GET", body) => {
  const apiBaseURL = "http://localhost:8080";

  const response = await fetch(apiBaseURL + url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json();
};
