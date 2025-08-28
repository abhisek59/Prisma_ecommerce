const asyncHandler = (requestHandler)=>{return(req, res, next)=>{
    Promise.resolve(requestHandler(req, res, next))
        .catch((err)=> next(err));
}
}
export { asyncHandler };

// Usage example
// import { asyncHandler } from './utils/asyncHandler.js';
