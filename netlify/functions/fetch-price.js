const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const { itemName, alertPrice, alertQuantity } = event.queryStringParameters;
    const url = `https://pixels-server.pixels.xyz/v1/marketplace/item/${itemName}?pid=65d092adeec72343ab1fe39a&v`;

    return fetch(url)
        .then(response => response.json())
        .then(data => {
            let message = '';
            for (const listing of data.listings) {
                if (listing.itemId === itemName) {
                    const price = listing.price;
                    const quantity = listing.quantity;
                    const ownerId = listing.ownerId;
                    const ownerUsername = data.ownerUsernames[ownerId] || 'Unknown';
                    if (price <= alertPrice && quantity >= alertQuantity) {
                        message += `${itemName} price is ${price}, quantity is ${quantity}, owner is ${ownerUsername}\n`;
                    }
                }
            }
            return { statusCode: 200, body: message };
        })
        .catch(error => ({ statusCode: 422, body: String(error) }));
};
