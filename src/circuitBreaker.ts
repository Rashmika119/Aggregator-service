export type BreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker<T> {
    private  static state: BreakerState = 'CLOSED';
    private static failures = 0;
    private static success = 0;
    private static lastFailureTime = 0;
    private _action;
    private _fallback

    constructor(
        private action: () => Promise<T>,   //T any type , action is the method we use the circuit breaker
        private options: {
            failureThreshold: number;      //number of failures% consider before open the breaker
            requestVolumeThreshold: number; //number of request that need,before evaluating a failure
            cooldownTime: number;           //the time wait before retry open=>half open
            halfOpenRequests: number;       //the number of success , for close the circuit
            fallback: () => T
        },
    ) {
        this._action = action; 
        this._fallback = options.fallback;
    }

    async fire(): Promise<T> {
        const now = Date.now();
        console.log("---------------------------------------------------------")
        console.log(`----breaker state ${CircuitBreaker.state}`)
        console.log(`-------last failure time ${CircuitBreaker.lastFailureTime}`)
        console.log(`-------failures ${CircuitBreaker.failures}`)
        console.log(`-------success ${CircuitBreaker.success}`)
        console.log("---------------------------------------------------------")
        if (CircuitBreaker.state == 'OPEN') {
            if (now - CircuitBreaker.lastFailureTime > this.options.cooldownTime) {
                CircuitBreaker.state = 'HALF_OPEN';
                CircuitBreaker.success = 0;
                CircuitBreaker.failures= 0;
                console.log("success requests limit reached");
                console.log("request state OPEN == >HALF_OPEN")
            } else {
                return this._fallback();
            }
        }
        try {
            const result = await this._action();
            this.recordSuccess();
            return result;

        } catch (err) {
            this.recordFailure();
            console.log("failure updated");
            if (CircuitBreaker.state === 'HALF_OPEN' && CircuitBreaker.failures>=this.options.halfOpenRequests) {
                CircuitBreaker.state = 'OPEN';
                CircuitBreaker.lastFailureTime = now;
                console.log("testing requests failed");
                console.log("| request state HALF_OPEN ==> OPEN")
            }
            if (CircuitBreaker.state === 'CLOSED' && this.shouldOpen()) {
                CircuitBreaker.state = 'OPEN';
                CircuitBreaker.lastFailureTime = now;
                console.log('Breaker opened');
                console.log("| state CLOSED ==> OPEN");
            }
            return this._fallback();

        }
    }


    private recordSuccess() {
        CircuitBreaker.success++;
        if (CircuitBreaker.state === 'HALF_OPEN' && CircuitBreaker.success >= this.options.halfOpenRequests) {
            CircuitBreaker.state = 'CLOSED';
            console.log('Breaker closed');
            console.log("| state HALF_OPEN ==> CLOSED");
        }
    }

    private recordFailure() {
        CircuitBreaker.failures++;
    }

    private shouldOpen() {
        const total = CircuitBreaker.success + CircuitBreaker.failures;
        if (total < this.options.requestVolumeThreshold) {
            return false;
        }
        const failureRate = CircuitBreaker.failures/ total;
        return failureRate > this.options.failureThreshold;
    }
}