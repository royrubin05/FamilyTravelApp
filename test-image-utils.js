
const { DESTINATION_IMAGES, getDestinationImage } = require('./src/lib/imageUtils');

// Mock data to simulate what AI is returning
const mockAiResponse = {
    matched_city_key: 'tel aviv',
    destination: 'TEL AVIV'
};

console.log("Testing Image Resolution:");
console.log("1. Direct Key Lookup ('tel aviv'):");
const direct = DESTINATION_IMAGES['tel aviv'];
console.log(direct ? "✅ Found: " + direct : "❌ Not Found");

console.log("\n2. getDestinationImage('Tel Aviv'):");
const resolved = getDestinationImage('Tel Aviv');
console.log(resolved !== "fallback_url" ? "✅ Resolved: " + resolved : "❌ Fallback used");

console.log("\n3. getDestinationImage('TLV'):");
const tlv = getDestinationImage('TLV'); // Should fallback unless we mapped it, but AI layer handles this.
console.log("TLV Result: " + tlv); 
