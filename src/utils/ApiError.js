class ApiError extends Error{
    constructor(
        statuscode,
        message = "Something went wrong",
        errors = [],
        stack = "",
    ){
        super(message)
        this.statuscode = statuscode;
        this.message = message,
        this.data = null,
        this.success = false,
        this.errors = errors
        if(stack){
            this.stack = stack
        } else {
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export { ApiError }
