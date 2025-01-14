const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function createTestUser() {
  try {
    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: 'elon@example.com',
      password: 'testpassword123',
      displayName: 'Elon Musk',
    });

    // Create user profile in Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      id: userRecord.uid,
      email: 'elon@example.com',
      displayName: 'Elon Musk',
      isAI: true,
      preferences: {
        theme: 'light',
        notifications: {
          desktop: true,
          mobile: true,
          email: true,
          mentionsOnly: false,
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log('Successfully created test user:', userRecord.uid);
    process.exit(0);
  } catch (error) {
    console.error('Error creating test user:', error);
    process.exit(1);
  }
}

createTestUser(); 