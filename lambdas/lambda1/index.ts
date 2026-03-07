async function getRandomJoke() {
  const response = await fetch("https://official-joke-api.appspot.com/random_joke");
  const data = await response.json();

  console.log(data.setup);
  console.log(data.punchline);
}