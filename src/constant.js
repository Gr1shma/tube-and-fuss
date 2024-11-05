export let databaseName = `tube-and-fuss`;
export let defaultPort = 6000;
export let corsOptions = {
    origin: process.env.CORS_ORIGIN,
}
export let expressJsonOption = {
    limits: "100kb"
}
export let expressStaticRoot = "public";
export let expressUrlEncodedOptions = {
    extended: true,
    limits: "100kb"
}

// bcrypt
export let saltRound = 10;
