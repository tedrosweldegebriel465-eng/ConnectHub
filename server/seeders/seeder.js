/**
 * ============================================
 * DATABASE SEEDER
 * Version: 2.0.0
 * Description: Seed the database with sample data
 *              including users, posts, comments, and more
 * ============================================
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');
const { faker } = require('@faker-js/faker');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import models
const User = require('../models/user');
const Post = require('../models/post');
const Comment = require('../models/comment');
const Message = require('../models/message');
const Notification = require('../models/notification');
const Story = require('../models/story');

// ============================================
// CONFIGURATION
// ============================================

const SEED_CONFIG = {
  users: 10,
  postsPerUser: 3,
  commentsPerPost: 2,
  messagesPerUser: 5,
  storiesPerUser: 1,
  notificationsPerUser: 3,
  clearExisting: true,
  verbose: true,
};

// ============================================
// LOGGING
// ============================================

const log = {
  info: (msg) => console.log('ℹ️', msg),
  success: (msg) => console.log('✅', msg),
  warning: (msg) => console.log('⚠️', msg),
  error: (msg) => console.log('❌', msg),
  progress: (msg) => console.log('📊', msg),
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function getRandomItems(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function getRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateHashtags() {
  const hashtags = ['technology', 'photography', 'art', 'music', 'sports', 'food', 'travel', 'fashion', 'coding', 'design', 'photography', 'nature', 'fitness', 'health', 'business', 'startup', 'marketing', 'education', 'science', 'innovation'];
  return getRandomItems(hashtags, Math.floor(Math.random() * 3) + 1);
}

function generateContent() {
  const templates = [
    "Just had the most amazing experience! 🤩",
    "Working on something exciting... stay tuned! 🚀",
    "Beautiful day to be alive! ☀️",
    "Learning new things every day. 💡",
    "Grateful for all the support! 🙏",
    "Chasing dreams and making them reality. 💫",
    "Coffee and code - the perfect combination! ☕",
    "Another day, another adventure. 🌍",
    "Proud of what we're building together. 💪",
    "Sometimes you just need to step back and breathe. 🌿",
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

function generateBio() {
  const bios = [
    "Software Developer | Coffee Lover ☕",
    "UI/UX Designer | Photography 📸",
    "Full Stack Developer | Tech Enthusiast",
    "Digital Nomad | Traveler 🌍",
    "Content Creator | Storyteller 📝",
    "Music Producer | DJ 🎵",
    "Fitness Coach | Health Advocate 💪",
    "Artist | Designer 🎨",
    "Writer | Poet ✍️",
    "Entrepreneur | Innovator 🚀",
  ];
  return bios[Math.floor(Math.random() * bios.length)];
}

function generateAvatar(username) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
}

// ============================================
// SEED FUNCTIONS
// ============================================

async function clearDatabase() {
  if (!SEED_CONFIG.clearExisting) return;
  
  log.info('Clearing existing data...');
  
  await User.deleteMany({});
  await Post.deleteMany({});
  await Comment.deleteMany({});
  await Message.deleteMany({});
  await Notification.deleteMany({});
  await Story.deleteMany({});
  
  log.success('Cleared existing data');
}

async function seedUsers() {
  log.info(`Creating ${SEED_CONFIG.users} users...`);
  
  const users = [];
  const baseUsers = [
    {
      username: 'yohannes_gebre',
      email: 'yohannes@example.com',
      password: await bcrypt.hash('password123', 10),
      name: 'Yohannes Gebre',
      bio: 'Software Developer | Buna & Tech Lover ☕',
      avatar: generateAvatar('yohannes_gebre'),
      isVerified: true,
      location: 'Mekelle, Tigray',
      website: 'https://yohannes.dev',
    },
    {
      username: 'freweyni_haile',
      email: 'freweyni@example.com',
      password: await bcrypt.hash('password123', 10),
      name: 'Freweyni Haile',
      bio: 'UI/UX Designer | Digital Artist 🎨',
      avatar: generateAvatar('freweyni_haile'),
      isVerified: true,
      location: 'Asmara',
      website: 'https://freweyni.design',
    },
    {
      username: 'alazar_tesfay',
      email: 'alazar@example.com',
      password: await bcrypt.hash('password123', 10),
      name: 'Alazar Tesfay',
      bio: 'Full Stack Developer | Socket.io Enthusiast ⚡',
      avatar: generateAvatar('alazar_tesfay'),
      isVerified: true,
      location: 'Aksum, Tigray',
      website: 'https://alazar.dev',
    },
    {
      username: 'luul_letebirhan',
      email: 'luul@example.com',
      password: await bcrypt.hash('password123', 10),
      name: 'Luul Letebirhan',
      bio: 'Product Designer & Tech Storyteller 📝',
      avatar: generateAvatar('luul_letebirhan'),
      isVerified: false,
      location: 'Adigrat, Tigray',
      website: 'https://luul.dev',
    },
    {
      username: 'kibrom_medhane',
      email: 'kibrom@example.com',
      password: await bcrypt.hash('password123', 10),
      name: 'Kibrom Medhane',
      bio: 'Cloud Architect & Backend Engineer ☁️',
      avatar: generateAvatar('kibrom_medhane'),
      isVerified: true,
      location: 'Shire, Tigray',
      website: 'https://kibrom.dev',
    },
    {
      username: 'robel_fitsum',
      email: 'robel@example.com',
      password: await bcrypt.hash('password123', 10),
      name: 'Robel Fitsum',
      bio: 'Mobile App Developer | Innovator 🚀',
      avatar: generateAvatar('robel_fitsum'),
      isVerified: false,
      location: 'Mekelle, Tigray',
      website: 'https://robel.dev',
    },
  ];
  
  users.push(...baseUsers);
  
  // Generate additional users
  for (let i = 0; i < SEED_CONFIG.users - baseUsers.length; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const rawUsername = faker.internet.username({ firstName, lastName }).toLowerCase();
    const username = rawUsername.replace(/[^a-z0-9_]/g, '_') || `user_${i}`;
    
    users.push({
      username,
      email: faker.internet.email({ firstName, lastName }),
      password: await bcrypt.hash('password123', 10),
      name: `${firstName} ${lastName}`,
      bio: generateBio(),
      avatar: generateAvatar(username),
      isVerified: Math.random() > 0.7,
      location: faker.location.city() + ', ' + faker.location.country(),
      website: faker.internet.url(),
    });
  }
  
  const createdUsers = await User.insertMany(users);
  log.success(`Created ${createdUsers.length} users`);
  
  return createdUsers;
}

async function seedFollows(users) {
  log.info('Creating follow relationships...');
  
  for (const user of users) {
    // Each user follows 3-8 random users
    const followCount = Math.floor(Math.random() * 6) + 3;
    const usersToFollow = getRandomItems(
      users.filter(u => u._id.toString() !== user._id.toString()),
      followCount
    );
    
    for (const userToFollow of usersToFollow) {
      if (!userToFollow.followers) {
        userToFollow.followers = [];
      }
      if (!userToFollow.followers.includes(user._id)) {
        userToFollow.followers.push(user._id);
        await userToFollow.save();
      }
    }
    
    // Update following array
    user.following = usersToFollow.map(u => u._id);
    await user.save();
  }
  
  log.success('Created follow relationships');
}

async function seedPosts(users) {
  log.info(`Creating ${SEED_CONFIG.postsPerUser} posts per user...`);
  
  const allPosts = [];
  const imageUrls = [
    'https://picsum.photos/800/400?random=1',
    'https://picsum.photos/800/400?random=2',
    'https://picsum.photos/800/400?random=3',
    'https://picsum.photos/800/400?random=4',
    'https://picsum.photos/800/400?random=5',
  ];
  const videoUrls = [
    '/uploads/stories/6a6cc27dd0ef2bd77ca6c438-1785517446944-967428559.mp4',
    '/uploads/stories/6a6cc27dd0ef2bd77ca6c438-1785518254265-785106186.mp4',
    '/uploads/stories/Create_a_second_ultra_cinem.mp4',
    '/uploads/1783687397913-330478517.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-futuristic-robotic-arm-working-in-a-lab-43187-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-city-at-night-with-neon-lights-42864-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-hands-typing-fast-on-a-laptop-keyboard-41372-large.mp4',
  ];
  
  for (const user of users) {
    const postCount = Math.floor(Math.random() * 3) + 1; // 1-3 posts per user
    
    for (let i = 0; i < postCount; i++) {
      const isVideo = Math.random() > 0.6;
      const hasImage = !isVideo && Math.random() > 0.3;
      const isPoll = !isVideo && Math.random() > 0.8;
      
      const postData = {
        content: generateContent() + ' ' + generateHashtags().map(t => `#${t}`).join(' '),
        author: user._id,
        createdAt: getRandomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()),
        views: Math.floor(Math.random() * 1000),
      };

      if (isVideo) {
        postData.video = videoUrls[Math.floor(Math.random() * videoUrls.length)];
      } else if (hasImage) {
        postData.image = imageUrls[Math.floor(Math.random() * imageUrls.length)];
      }
      
      if (isPoll) {
        postData.isPoll = true;
        postData.pollOptions = [
          { text: faker.lorem.words(2), votes: [] },
          { text: faker.lorem.words(2), votes: [] },
        ];
        postData.pollEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      }
      
      allPosts.push(postData);
    }
  }
  
  const createdPosts = await Post.insertMany(allPosts);
  log.success(`Created ${createdPosts.length} posts`);
  
  return createdPosts;
}

async function seedComments(users, posts) {
  log.info(`Creating ${SEED_CONFIG.commentsPerPost} comments per post...`);
  
  const allComments = [];
  
  for (const post of posts) {
    const commentCount = Math.floor(Math.random() * SEED_CONFIG.commentsPerPost) + 1;
    const commenters = getRandomItems(users, commentCount);
    
    for (const commenter of commenters) {
      const comment = {
        content: faker.lorem.sentence(Math.floor(Math.random() * 15) + 5),
        author: commenter._id,
        post: post._id,
        createdAt: getRandomDate(post.createdAt, new Date()),
      };
      allComments.push(comment);
    }
  }
  
  const createdComments = await Comment.insertMany(allComments);
  log.success(`Created ${createdComments.length} comments`);
  
  return createdComments;
}

async function seedMessages(users) {
  log.info(`Creating ${SEED_CONFIG.messagesPerUser} messages per user...`);
  
  const allMessages = [];
  
  for (const user of users) {
    const recipients = getRandomItems(
      users.filter(u => u._id.toString() !== user._id.toString()),
      Math.floor(Math.random() * 3) + 1
    );
    
    for (const recipient of recipients) {
      const messageCount = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < messageCount; i++) {
        allMessages.push({
          sender: user._id,
          recipient: recipient._id,
          content: faker.lorem.sentence(Math.floor(Math.random() * 10) + 3),
          createdAt: getRandomDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()),
          read: Math.random() > 0.5,
        });
      }
    }
  }
  
  const createdMessages = await Message.insertMany(allMessages);
  log.success(`Created ${createdMessages.length} messages`);
  
  return createdMessages;
}

async function seedStories(users) {
  log.info(`Creating ${SEED_CONFIG.storiesPerUser} story per user...`);
  
  const allStories = [];
  const storyImages = [
    'https://picsum.photos/400/700?random=1',
    'https://picsum.photos/400/700?random=2',
    'https://picsum.photos/400/700?random=3',
    'https://picsum.photos/400/700?random=4',
  ];
  
  for (const user of users) {
    if (Math.random() > 0.4) { // 60% chance of having a story
      const story = {
        author: user._id,
        media: storyImages[Math.floor(Math.random() * storyImages.length)],
        mediaType: 'image',
        caption: faker.lorem.sentence(Math.floor(Math.random() * 8) + 2),
        createdAt: getRandomDate(new Date(Date.now() - 12 * 60 * 60 * 1000), new Date()),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        viewers: getRandomItems(users, Math.floor(Math.random() * 5)),
      };
      allStories.push(story);
    }
  }
  
  const createdStories = await Story.insertMany(allStories);
  log.success(`Created ${createdStories.length} stories`);
  
  return createdStories;
}

async function seedNotifications(users, posts, comments) {
  log.info(`Creating ${SEED_CONFIG.notificationsPerUser} notifications per user...`);
  
  const allNotifications = [];
  const types = ['like', 'comment', 'follow', 'mention'];
  
  for (const user of users) {
    const notificationCount = Math.floor(Math.random() * 3) + 1;
    const senders = getRandomItems(
      users.filter(u => u._id.toString() !== user._id.toString()),
      notificationCount
    );
    
    for (const sender of senders) {
      const type = types[Math.floor(Math.random() * types.length)];
      const notification = {
        recipient: user._id,
        sender: sender._id,
        type: type,
        read: Math.random() > 0.5,
        createdAt: getRandomDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()),
      };
      
      if (type === 'like' || type === 'comment') {
        const randomPost = posts[Math.floor(Math.random() * posts.length)];
        if (randomPost) {
          notification.post = randomPost._id;
        }
      }
      
      if (type === 'comment') {
        const randomComment = comments[Math.floor(Math.random() * comments.length)];
        if (randomComment) {
          notification.comment = randomComment._id;
        }
      }
      
      notification.message = `${sender.name} ${type === 'like' ? 'liked your post' : type === 'comment' ? 'commented on your post' : type === 'follow' ? 'started following you' : 'mentioned you in a post'}`;
      
      allNotifications.push(notification);
    }
  }
  
  const createdNotifications = await Notification.insertMany(allNotifications);
  log.success(`Created ${createdNotifications.length} notifications`);
  
  return createdNotifications;
}

// ============================================
// MAIN SEED FUNCTION
// ============================================

async function seedDatabase() {
  const startTime = Date.now();
  
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🌱 DATABASE SEEDER');
    console.log('='.repeat(60) + '\n');
    
    // Connect to MongoDB
    log.info('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    log.success('Connected to MongoDB');
    
    // Clear existing data
    await clearDatabase();
    
    // Seed data
    const users = await seedUsers();
    await seedFollows(users);
    const posts = await seedPosts(users);
    const comments = await seedComments(users, posts);
    await seedMessages(users);
    await seedStories(users);
    await seedNotifications(users, posts, comments);
    
    // Summary
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SEED COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`📊 Summary:`);
    console.log(`  • Users: ${await User.countDocuments()}`);
    console.log(`  • Posts: ${await Post.countDocuments()}`);
    console.log(`  • Comments: ${await Comment.countDocuments()}`);
    console.log(`  • Messages: ${await Message.countDocuments()}`);
    console.log(`  • Notifications: ${await Notification.countDocuments()}`);
    console.log(`  • Stories: ${await Story.countDocuments()}`);
    console.log(`  • Time: ${duration.toFixed(2)}s`);
    console.log('='.repeat(60) + '\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error seeding database:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// ============================================
// RUN SEEDER
// ============================================

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n⚠️ Seeding interrupted by user');
  process.exit(0);
});

// Start seeding
seedDatabase();