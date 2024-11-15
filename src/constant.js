export let databaseName = `tube-and-fuss`;
export let defaultPort = 6000;
export let corsOptions = {
    origin: process.env.CORS_ORIGIN,
}
export let expressJsonOption = {
    limits: "50mb"
}
export let expressStaticRoot = "public";
export let expressUrlEncodedOptions = {
    extended: true,
    limits: "50mb"
}

// bcrypt
export let saltRound = 10;

export let cloudinaryConfig = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
}

export let apiRootUrl = "/api/v1";

export let cookiesOptions = {
    httpOnly: true,
    secure: true,
}
