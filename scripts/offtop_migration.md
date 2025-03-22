To begin the migration process, first export all tracks by compiling them into a zip archive. From the track management interface, load all tracks and capture the responses from the "library" API endpoints. The responses will be in JSON format, structured as follows:

```
[
    {
        "beatId": "unique_identifier_1",
        "trackId": null,
        "userId": "user_identifier",
        "bpm": 120,
        ...
        "scale": 1,
        "tags": [
            "tag1",
            "tag2"
        ],
    }
        ...
]
```

Next, execute the following processing steps in sequence:
1. Run extract_tags_from_offtop.py to extract metadata tags from the JSON into a new file
2. Execute rename_with_proper_tags.py to standardize track names and apply tags in the [tag] format
3. Run upload_to_service.py to transfer the processed tracks to the destination service
