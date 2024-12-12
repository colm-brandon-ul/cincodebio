#!/bin/bash

# Base64 encode all values in a YAML file
# For k8s secrets as it requires base64 encoded values.
# Usage: ./base64.sh
# Input: secrets.yaml
# Output: secrets-output.yaml

# Create temporary file
temp_file=$(mktemp)

# Process each line
while IFS=: read -r key value; do
    # Skip empty lines
    [ -z "$key" ] && continue
    
    # Trim whitespace from value
    value=$(echo "$value" | xargs)
    
    # Base64 encode value
    encoded=$(echo -n "$value" | base64)
    
    # Write to temp file with original formatting
    echo "${key}: ${encoded}" >> "$temp_file"
done < "secrets.yaml"

# Replace original file
mv "$temp_file" "secrets-output.yaml"