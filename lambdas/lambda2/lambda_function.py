import json
import urllib.request

def lambda_handler(event, context):
  try:
    with urllib.request.urlopen("http://ip-api.com/json", timeout=5) as response:
      data = json.loads(response.read().decode("utf-8"))

    return {
      "statusCode": 200,
      "headers": {"Content-Type": "application/json"},
      "body": json.dumps({
        "source": "ip-api",
        "location": {
          "country": data.get("country"),
          "regionName": data.get("regionName"),
          "city": data.get("city"),
          "lat": data.get("lat"),
          "lon": data.get("lon")
        }
      })
    }
  except Exception as e:
    return {
      "statusCode": 502,
      "headers": {"Content-Type": "application/json"},
      "body": json.dumps({"message": "Failed to fetch location", "error": str(e)})
    }
