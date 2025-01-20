import NodeCache from 'node-cache';

// Create a new cache instance with a default TTL of 24 hours
const cache = new NodeCache({ stdTTL: 86400 });

export default cache;