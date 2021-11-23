const { Readable } = require('stream');

module.exports = {
  async search() {
    const readableStream = new Readable();

    readableStream._read = () => {};    
    readableStream._destroy = (_, callback) => {
      callback();
    };

    const users = [{ id: 1, name: 'John Doe', type: "admin" }, { id: 2, name: 'Michael', type: "operator" }];
    const write = (user) => new Promise(resolve => {
      setTimeout(
        () => {
          const snapshot = {
            'id': user.id,
            'data': user
          }

          resolve(
            readableStream.push(JSON.stringify(snapshot))
          );
        },
        500
      )
    });

    for (let user of users) await write(user);

    readableStream.destroy();

    return readableStream;
  },

  async insert(rows) {
    process.stdout.write(` ** Firestore searched rows: ${JSON.stringify(rows)} ** `);
  }
};
