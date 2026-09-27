import mongoose from 'mongoose';

(async () => {
  await mongoose.connect('mongodb://localhost:27017/eventSnapDB');
  const db = mongoose.connection.db;

  const users = await db.collection('users').find(
    { email: { $in: ['mallu@gmail.com', 'lalitha@gmail.com'] } },
    { projection: { _id: 1, name: 1, businessName: 1, email: 1, password: 1 } }
  ).toArray();

  console.log('USERS');
  console.log(JSON.stringify(users, null, 2));

  const portfolios = await db.collection('portfolios').find(
    { slug: { $in: ['mallu-photographer', 'lalitha-photoshop'] } },
    { projection: { _id: 1, slug: 1, user: 1, title: 1 } }
  ).toArray();

  console.log('PORTFOLIOS');
  console.log(JSON.stringify(portfolios, null, 2));

  await mongoose.disconnect();
})();
