import requests

response = requests.get("http://ip-api.com/json")
data = response.json()

print("Country:", data["country"])
print("City:", data["city"])
print("Latitude:", data["lat"])
print("Longitude:", data["lon"])