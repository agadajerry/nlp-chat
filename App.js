const express = require('express');
const bodyParser = require('body-parser');
const natural = require('natural');
const app = express();
const port = 3000;

app.use(bodyParser.json());

let conversationState = {
  currentIntent: null,
  requiredEntities: [],
  collectedEntities: {},
  currentEntityIndex: 0
};

// Sample configuration for intents and responses
const intents = {
  greet_user: {
    phrases: [
      "hello",
      "hi",
      "hey",
      "what's up",
      "how are you"
    ],
    entities: [],
    responses: ["Hello! How can I assist you today?"]
  },
  book_flight: {
    phrases: [
      "I want to book a flight",
      "Can you help me book a flight?",
      "I need a flight to Paris",
      "Book a flight",
      "I want to travel",
      "Can you book me a flight on Monday?"
    ],
    entities: ['destination', 'date'],
    responses: [
      "Great! Where would you like to fly?",
      "What date would you prefer to fly to {destination}?",
      "Flight to {destination} on {date} has been booked!"
    ]
  },
  order_food: {
    phrases: [
      "I'd like to order food",
      "Can I get some food?",
      "I want to order a pizza",
      "Order food for me",
      "Get me some burgers",
      "I want to order 2 tacos"
    ],
    entities: ['food_item', 'quantity'],
    responses: [
      "What would you like to order?",
      "How many {food_item}s would you like?",
      "Order of {quantity} {food_item}(s) placed successfully!"
    ]
  }
};

// Sample tokenizer using `natural`
const tokenizer = new natural.WordTokenizer();

// Detect intent from user input
function detectIntent(userInput) {
  const tokens = tokenizer.tokenize(userInput.toLowerCase());
  
  // Check against each intent's phrases
  for (const [intent, config] of Object.entries(intents)) {
    for (const phrase of config.phrases) {
      const phraseTokens = tokenizer.tokenize(phrase.toLowerCase());
      
      // Using Jaro-Winkler similarity for more flexible matching
      const similarity = natural.JaroWinklerDistance(userInput.toLowerCase(), phrase.toLowerCase());
      if (similarity > 0.7) { // Threshold for similarity
        return intent;
      }
    }
  }

  // Default to greet user if no match is found
  return 'greet_user';
}

// Handle dynamic entity extraction and conversation flow
function handleDynamicEntityExtraction(userInput) {
  let nextEntity = conversationState.requiredEntities[conversationState.currentEntityIndex];
  conversationState.collectedEntities[nextEntity] = userInput;

  conversationState.currentEntityIndex += 1;
  
  // If all required entities are collected, generate the final response
  if (conversationState.currentEntityIndex >= conversationState.requiredEntities.length) {
    let responseTemplate = intents[conversationState.currentIntent].responses.slice(-1)[0];
    
    // Replace placeholders with collected entity values
    Object.keys(conversationState.collectedEntities).forEach((entity) => {
      responseTemplate = responseTemplate.replace(`{${entity}}`, conversationState.collectedEntities[entity]);
    });
    
    // Reset conversation state
    conversationState.currentIntent = null;
    conversationState.collectedEntities = {};
    conversationState.currentEntityIndex = 0;
    return responseTemplate;
  } else {
    // Ask for the next missing entity
    nextEntity = conversationState.requiredEntities[conversationState.currentEntityIndex];
    return `Please provide ${nextEntity}.`;
  }
}

// Process user input and determine the response
function processUserInput(userInput) {
  if (!conversationState.currentIntent) {
    conversationState.currentIntent = detectIntent(userInput);
    conversationState.requiredEntities = intents[conversationState.currentIntent].entities;
    conversationState.currentEntityIndex = 0;
    conversationState.collectedEntities = {};
    return intents[conversationState.currentIntent].responses[0];
  } else {
    return handleDynamicEntityExtraction(userInput);
  }
}

// Handle user messages via API
app.post('/message', (req, res) => {
  const userMessage = req.body.message;
  const botResponse = processUserInput(userMessage);
  res.json({ response: botResponse });
});

// Start the server
app.listen(port, () => {
  console.log(`Chatbot server running at http://localhost:${port}`);
});
