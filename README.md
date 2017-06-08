# dbos

## Data Storage

The server reads and stores all information to disk, within the directory specified in the `DIRECTORY` environment variable.

- `${DIRECTORY}/keys` contains a JSON object with `secret` and `public` keys.  Their values are hex-encoded libsodium signature keys for signing publications.

- `${DIRECTORY}/accessions` is an append-only, line-delimited, plain-text file.  Each line contains an ISO8601 timestamp, followed by a comma, and then a hex-encoded SHA256 publication digest.  The line number is the accession number of the publication.  Each line is less than Linux' `PIPE_BUF`, affording atomicity.

- `${DIRECTORY}/publications/` contains:

  - `{digest}.json` files, deterministically-serialized JSON objects representing publications, with the addition of date stamps.

  - `{digest}.sig` files containing hex-encoded, detached libsodium signatures for the corresponding JSON files.

  - a `{digest}` directory per publication that contains:

    - `{public key}.json` files, deterministically-serialized JSON objects containing publication timestamps and cryptographic signatures

    - `{digest}` files, containing attachment data

    - `{digest}.type` files, containing MIME types for attachment data
