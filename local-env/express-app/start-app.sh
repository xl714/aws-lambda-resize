#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"

app_frame_file="$script_dir/app-frame.js"
app_frame_tmp_file="$script_dir/app-frame-tmp.js"
app_final_file="$script_dir/app.js"

viewer_handler_file="$repo_root/lambda/viewer-request-function/index.js"
origin_handler_file="$repo_root/lambda/origin-response-function/index.js"
origin_src_dir="$repo_root/lambda/origin-response-function/src"
local_src_dir="$script_dir/src"

extract_business_logic() {
    local source_file="$1"
    local code=""
    local keep=false

    while IFS='' read -r line; do
        if [[ $line == *"START_OF_BUSINESS_LOGIC_CODE"* ]]; then
            keep=true
        fi
        if [[ $keep == true ]]; then
            code+="${line}\n"
        fi
        if [[ $line == *"END_OF_BUSINESS_LOGIC_CODE"* ]]; then
            keep=false
        fi
    done < "$source_file"

    printf '%b' "$code"
}

replace_placeholder() {
    local placeholder="$1"
    local code="$2"
    local source_file="$3"
    local target_file="$4"
    local line_nb

    line_nb="$(grep -n "$placeholder" "$source_file" | cut -d ":" -f 1)"
    if [[ -z "$line_nb" ]]; then
        echo "Placeholder not found: $placeholder" >&2
        exit 1
    fi

    {
        head -n "$((line_nb-1))" "$source_file"
        printf '%s\n' "$code"
        tail -n "+$((line_nb+1))" "$source_file"
    } > "$target_file"
}

viewer_code="$(extract_business_logic "$viewer_handler_file")"
replace_placeholder "VIEWER_REQUEST_CODE" "$viewer_code" "$app_frame_file" "$app_frame_tmp_file"

origin_code="$(extract_business_logic "$origin_handler_file")"
replace_placeholder "ORIGIN_RESPONSE_CODE" "$origin_code" "$app_frame_tmp_file" "$app_final_file"
rm -f "$app_frame_tmp_file"

mkdir -p "$local_src_dir"
cp -rf "$origin_src_dir"/. "$local_src_dir"/

if [[ -z "${BUCKET_NAME:-}" ]]; then
    echo "BUCKET_NAME is not set. The local app will fall back to the bucket from the mock event or the handler default."
fi

export APP_ENV="${APP_ENV:-local}"

node "$app_final_file"
