import { Logger } from "@nestjs/common";

export type BreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker<T> {
private readonly logger= new Logger(CircuitBreaker.name)

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
        this.logger.debug(`Circuit breaker invoked`)
        const now = Date.now();

        if (CircuitBreaker.state == 'OPEN') {
            if (now - CircuitBreaker.lastFailureTime > this.options.cooldownTime) {
                CircuitBreaker.state = 'HALF_OPEN';
                CircuitBreaker.success = 0;
                CircuitBreaker.failures= 0;
                this.logger.warn("circuit state changed OPEN == > HALF_OPEN")
            } else {
                this.logger.warn(`Open state : returning fallback`)
                return this._fallback();
            }
        }
        try {
            const result = await this._action();
            this.recordSuccess();
            this.logger.log("weather fetching action succeded")
            return result;

        } catch (err) {
            this.logger.warn(`weather fetching action failed`);
            this.recordFailure();
        
            if (CircuitBreaker.state === 'HALF_OPEN' && CircuitBreaker.failures>=this.options.halfOpenRequests) {
                CircuitBreaker.state = 'OPEN';
                CircuitBreaker.lastFailureTime = now;
                this.logger.error("circuite state changed HALF_OPEN ==> OPEN")
            }
            if (CircuitBreaker.state === 'CLOSED' && this.shouldOpen()) {
                CircuitBreaker.state = 'OPEN';
                CircuitBreaker.lastFailureTime = now;
                this.logger.error("circuit state changed CLOSED ==> OPEN");
            }
            this.logger.debug(`-----breaker state ----> ${CircuitBreaker.state}`)
            this.logger.debug(`-----last failure time ----> ${CircuitBreaker.lastFailureTime}`);
            this.logger.debug(`-----failure count ----> ${CircuitBreaker.failures}`);
            this.logger.debug(`-----success count ----> ${CircuitBreaker.success}`);
            return this._fallback();

        }
    }


    private recordSuccess() {
        CircuitBreaker.success++;
        if (CircuitBreaker.state === 'HALF_OPEN' && CircuitBreaker.success >= this.options.halfOpenRequests) {
            CircuitBreaker.state = 'CLOSED';
        
            this.logger.log("circuite state changed HALF_OPEN ==> CLOSED");
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