export const handler = async () => {
  const response = await fetch("https://official-joke-api.appspot.com/random_joke");
  if (!response.ok) {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Failed to fetch joke" })
    };
  }

  const joke = await response.json();

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "official-joke-api",
      joke
    })
  };
};
