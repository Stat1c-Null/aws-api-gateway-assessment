export const handler = async () => {
  // Fetch a random joke from the official joke API
  const response = await fetch("https://official-joke-api.appspot.com/random_joke");
  if (!response.ok) {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Failed to fetch joke" })
    };
  }

  const joke = await response.json();
  // Return the joke in the response
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "official-joke-api",
      joke
    })
  };
};
