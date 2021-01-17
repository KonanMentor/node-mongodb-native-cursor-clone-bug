const { MongoClient } = require("mongodb");

(async () => {
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // Important for reproducibility of the bug.
    // Limit number of parallel connections to 1
    // so that operations are executed one by one.
    // I hope that's how it works.
    maxPoolSize: 1,
  };
  const mongoClient = await MongoClient.connect(
    "mongodb://localhost",
    options
  );

  const db = mongoClient.db("test");

  // Content of the collection doesn't matter
  const collection = db.collection("test");

  const cursor = collection.find();
  // What happens in mongodb@3.6.3 is that `options` of the FindOperation
  // for the original cursor propagates to the cloned cursor as a reference.
  // Since `options` also contains `session`, operation's session propagates
  // to cloned cursor's options. This violates the principle of using an implicit
  // session only for one operation and may cause
  // "MongoError: Cannot use a session that has ended".
  const clonedCursor = cursor.clone();

  const nextPromise = cursor
    .toArray()
    .then(docs => console.log(collection.namespace, "next", docs))
    .catch(error => console.error(collection.namespace, "next failed", error));
  // Call `clonedCursor.count()` right after `cursor.next()` in order to capture the FindOperation's
  // session. The idea is to call `clonedCursor.count()` before `operation.clearSession` gets called
  // and the session of the FindOpereration still exists.
  //
  // `operation.clearSession` which is called in core/cursor.js `_endSession` doesn't help
  // in case `find` operation completes before `count` operation starts because the options
  // are cloned in core/sdam/server.js `command` method when the session is still there.
  // So at the moment when cloned operation gets executed it will use already ended session
  // of the FindOperation.
  const countPromise = clonedCursor
    .count()
    .then(count => console.log(collection.namespace, "count", count))
    .catch(error => console.error(collection.namespace, "count failed", error));

  await Promise.all([nextPromise, countPromise]);

  mongoClient.close();
})();
