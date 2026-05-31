import assert from "node:assert/strict";
import { addressNeedsReview, buildDeliveryMapLinks, buildGoogleMapsLink, buildWazeLink } from "../lib/waze";

const gpsWaze = buildWazeLink({ latitude: 10.246015, longitude: -61.49839, address: "San Fernando, Trinidad and Tobago" });
assert.equal(gpsWaze, "https://waze.com/ul?ll=10.246015,-61.49839&navigate=yes");

const gpsGoogle = buildGoogleMapsLink({ latitude: 40.7128, longitude: -74.006, address: "New York, NY, United States" });
assert.equal(gpsGoogle, "https://maps.google.com/?q=40.7128,-74.006");

const addressWaze = buildWazeLink({ address: "Coffee Street, San Fernando, Trinidad and Tobago" });
assert.equal(addressWaze, "https://waze.com/ul?q=Coffee%20Street%2C%20San%20Fernando%2C%20Trinidad%20and%20Tobago&navigate=yes");

const addressGoogle = buildGoogleMapsLink({ address: "120 Broadway, New York, NY, United States" });
assert.equal(addressGoogle, "https://maps.google.com/?q=120%20Broadway%2C%20New%20York%2C%20NY%2C%20United%20States");

const sharedLinks = buildDeliveryMapLinks({ locationLink: "https://maps.google.com/?q=10.5,-61.4", address: "Chaguanas, Trinidad and Tobago" });
assert.equal(sharedLinks.hasCoordinates, true);
assert.equal(sharedLinks.addressNeedsReview, false);
assert.equal(sharedLinks.wazeLink, "https://waze.com/ul?ll=10.5,-61.4&navigate=yes");

const incompleteLinks = buildDeliveryMapLinks({ address: "Main Road" });
assert.equal(incompleteLinks.addressNeedsReview, true);
assert.equal(incompleteLinks.wazeLink, "https://waze.com/ul?q=Main%20Road&navigate=yes");

assert.equal(addressNeedsReview("San Fernando, Trinidad and Tobago"), false);
assert.equal(addressNeedsReview("Main Road"), true);

console.log("Map link generation tests passed.");
