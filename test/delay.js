async function delay(ms=100) {
    return new Promise(
        resolve => {
            setTimeout(resolve, ms);
        }
    );
}

module.exports = {
    delay
};
