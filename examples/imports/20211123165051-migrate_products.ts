const { Readable } = require('stream');

module.exports = {
  async search() {
    const readableStream = new Readable();

    readableStream._read = () => {};    
    readableStream._destroy = (_, callback) => {
      callback();
    };

    const products = [{ id: 1, description: 'Product 1' }, { id: 2, description: 'Product 2' }];
    const write = (product) => new Promise(resolve => {
      setTimeout(
        () => {
          const snapshot = {
            'id': product.id,
            'data': product
          }

          resolve(
            readableStream.push(JSON.stringify(snapshot))
          );
        },
        500
      )
    });

    for (let product of products) await write(product);

    readableStream.destroy();

    return readableStream;
  },

  async insert(rows) {
    process.stdout.write(` ** Firestore searched rows: ${JSON.stringify(rows)} ** `);
  }
};
