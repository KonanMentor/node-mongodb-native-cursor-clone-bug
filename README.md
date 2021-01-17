## Run

```sh
npm ci
npm start
```

## Expected result

`count` operation runs successfully.

Stdout (in case of empty collection):
```
test.test next []
test.test count 0
```

## Actual result

`count` operation fails.

Stdout (in case of empty collection):
```
test.test next []
test.test count failed { MongoError: Cannot use a session that has ended
```
