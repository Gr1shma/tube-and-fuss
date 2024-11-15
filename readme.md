# tube-and-fuss

a backend system combining features of youtube and twitter to support video uploads, tweets with social interaction functionalities.

tube-and-fuss provides a backend platform where users can share video-based tweets and engage through comments and likes.



## technologies used
- node
- express
- mongodb
- cloudinary


## features

### 1. user authentication
- secure jwt-based login for user and password is encrypted using bcrypt.

### 2. content management
- handles video uploads, tweets, and file attachments efficiently.
- supports comments, likes, and user interactions on tweets and videos.

### 3. database management
- uses mongodb to store:
  - user profiles
  - videos
  - tweets
  - comments
  - likes
  - subscription
  - playlist

### 4. api development
- provides apis for:
  - crud operations
  - managing videos
  - handling user interactions

### 5. like and comment features
- manages likes and comments to enhance user engagement with tweets and videos.

### 6. file handling
- supports uploading and processing of:
  - images
  - videos

### 7. security and error handling
- ensures:
  - input validation and secure endpoints
  - comprehensive error handling for smooth operation


## db schema

[model link](https://app.eraser.io/workspace/ytpqz1vogxgy1jzidkzj?origin=share)

![db image](db-schema.png)


## run locally

clone the project

```bash
  git clone https://github.com/gr1shma/tube-and-fuss.git
```

go to the project directory

```bash
  cd tube-and-fuss
```

install dependencies

```bash
  yarn install
```

start the server

```bash
  yarn run dev
```


## environment variables

to run this project, you will need to add the following environment variables to your .env file

`PORT`

`CORS_ORIGIN`

`MONGODB_URI`

`ACCESS_TOKEN_SECRET`

`ACCESS_TOKEN_EXPIRY`

`REFRESH_TOKEN_SECRET`

`REFRESH_TOKEN_EXPIRY`

`CLOUDINARY_CLOUD_NAME`

`CLOUDINARY_API_KEY`

`CLOUDINARY_API_SECRET`

`CLOUDINARY_URL`


## acknowledgements

 - [chai aur javascript backend | hindi](https://youtube.com/playlist?list=PLu71SKxNbfoBGh_8p_NS-ZAh6v7HhYqHW&si=kl1jyZzouQ7x9ixH)
