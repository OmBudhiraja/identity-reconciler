# Identity Reconciler

[Deployed URL](https://identity-reconciler.onrender.com/)


## Setting up locally

```bash
mv .env.example .env
# Fill in the .env file with the required values

pnpm install
pnpm dev
```

#### Send POST request to `/identify` with the following body

```json
{
  "email": "test@example.com",
  "phoneNumber": 9999999999
}
```
