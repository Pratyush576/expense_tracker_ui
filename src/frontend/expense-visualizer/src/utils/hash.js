export const generateHash = (inputString) => {
    let hash = 0;
    for (let i = 0; i < inputString.length; i++) {
        const char = inputString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    // Convert to a positive number and then to base 36 (alphanumeric)
    const base36Hash = (hash >>> 0).toString(36);
    // Ensure it's 10 characters long, pad or truncate if necessary
    return base36Hash.substring(0, 10).padEnd(10, '0');
};
