Rollout Plan --API Version Migration (V1 -->V2)
-----------------------------------------------

🌟 Stratergy: Canary Deployement

📌Deploy version 1 and version 2 side by side 

📌Gradual traffic shifting to v2

📌When v2 reaches 95% traffic, v1 will be removed

📌Shutdown date for v1: 2025-12-30

🌟 Version Overview

 ✔ Version 1- flight service,Hotel service

      sample response:
      {
    "flights": [
        {
            "id": "26218126-4b01-49ba-b827-ce6366ff6abd",
            "name": "Sri lanka Airlines",
            "startDestination": "CMB",
            "endDestination": "HMBT",
            "locationType": "coastal",
            "departTime": "2025-10-08T18:30:00.000Z",
            "arriveTime": "2025-10-08T20:15:00.000Z",
            "price": 15000
        }
    ],
    "hotels": [
        {
            "id": "7cf42bc5-7d9d-4b52-a7f0-fd6c051feb77",
            "name": "Shrangrilla",
            "location": "HMBT",
            "rating": 5,
            "pricePerNight": 10000,
            "checkInEndTime": "21:45"
        }
    ],
    "degraded": false
}

 ✔ Version 2- fligh service, hotel service and weathere service

      sample response:

      {
     "flights":[...],
     "hotels":[...],
     "weather":
      {
        "id": "632aaffd-b966-425b-9283-b5eba4993c8f",
        "date": "2025-10-14T00:00:00.000Z",
        "location": "HMBT",
        "tempMin": 30.8,
        "tempMax": 24.9,
        "condition": "Partly Cloudy"
      }
}

🌟Rollout Phases

💡 Phase 1 -Parallel Deployemnet 

📌Deploy version 1 and version 2 side by side

📌Expose V2 endpoints for new consumers

📌No impact on existing consumers.So zero distruption for v1 consumers

📌Documentation updated to show v2 availability

💡 Phase 2 - Traffic Monitoring and Canary start

📌Here test the v2 in production with real traffic.

📌Beging routing a small trffic to v2 (5-10%)

📌Select a specific user group (ex:like premium users)

📌Then can give X header for them (ex:X-API-Version: 2)

📌First we can redirect them to version 2 and give them the response in version 1 structure

📌when 60% of them reach them give default values for the consumers that use version1 📌although now to adapt them for version 2 response structure

📌Key Monitoring:

- Error rate
- Latency
- Weather service failure
- Response consistency
  
📌Rollback to v1 immediately if an instability occurs in v2

💡 Phase 3 - Gradually trffic shift

📌Traffic increases in steps

Rollout Step	    % to v2	        % to v1
Start	            5–10%	          90–95%
Step 2	          25%	            75%
Step 3	          50%	            50%
Step 4	          75%	            25%

📌Continue monitoring failures and performance

💡 Phase 4 – Make v2 Default (95% Traffic)

📌v2 handles almost all requests

📌All new integrations use v2 only

📌v1 remains for legacy consumers

📌Deprecation warning period begins

- Example deprecation header:

Deprecation: true
Sunset: 2025-12-30
Use: /v2/trips/search

💡 Phase 5 – Sunset & Retirement of v1

📌Triggered when:

- v2 reaches 95% adoption
- Most consumers migrated
  
📌v1 shutdown date: 2025-12-30

📌After shutdown, v1 endpoints may return:

- 410 Gone OR
- 404 Not Found
  
📌No protocol-level redirect or request transformation


