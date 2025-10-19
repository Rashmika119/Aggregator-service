import { Injectable, HttpException, Logger, BadRequestException, BadGatewayException, InternalServerErrorException } from '@nestjs/common';

import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';

import { CircuitBreaker } from './circuitBreaker';
import { AxiosError } from 'axios';


@Injectable()
export class AggregatorService {

  constructor(private readonly httpService: HttpService) { }
  private readonly logger = new Logger(AggregatorService.name)

  async fetchData(dateStr: any, endDestination: string) {
    this.logger.log(`Fetching weather for ${endDestination} on ${dateStr}`)
    return await this.callService('localhost', 5010, `/weather/seven-days/${dateStr}/${endDestination}`)
  }

  private async callService(hostname: string, port: number, path: string): Promise<any> {
    const url = `http://${hostname}:${port}${path}`;
    this.logger.debug(`Calling service --> ${url}`)

    try {
      const { data } = await firstValueFrom(this.httpService.get<any>(url));
      this.logger.debug(`Response recieved from ${url}`);
      return data
    } catch (error) {
      this.logger.error(`Error calling ${url}`, error.stack);
      if (error instanceof AxiosError) {
        throw new BadGatewayException(`External service with path ${path} failed: ${error.message}`);
      } else {
        throw new InternalServerErrorException('Internal server error');
      }
    }
  }

  //---------------version 1 -----------------
  //Include weather and hotel services
  //use scatter gather pattern

  async getFlightAndHotelInfo(startDestination: string, endDestination: string, departTime: string) {
    if (!startDestination || !endDestination || !departTime) {
      this.logger.warn(`Missing fields -> start=${startDestination},end=${endDestination},departTime=${departTime}`)
      throw new BadRequestException('fStart, end destination and departTime are required');
    }

    this.logger.log(`Fetching flight + hotel info for ${startDestination} to ${endDestination} at ${departTime}`)

    const flightPromise = this.callService(
      'localhost',
      3000,
      `/flight?startDestination=${startDestination}&endDestination=${endDestination}&departTime=${departTime}`);

    const hotelPromise = this.callService(
      'localhost',
      4000,
      `/hotel?location=${endDestination}`

    );
    const TOTATL_BUDGET = 1000;
    let flights = null;
    let hotels = null;
    let degraded = false;

    try {
      //promise.race([promise1,promise2]).If promise2 wins(the timeout),then it jumps to catch error
      const results = await Promise.race([Promise.all([flightPromise, hotelPromise]), new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), TOTATL_BUDGET))]);

      if (Array.isArray(results)) {
        [flights, hotels] = results;
      }
      this.logger.log(`Flight + hotel data recieved`)
    } catch (error) {
      degraded = true;
      this.logger.warn(`Timout/degraded mode --> fallback started`)

      flights = await Promise.resolve(flightPromise).catch(() => null);
      hotels = await Promise.resolve(hotelPromise).catch(() => null);
    }


    return {
      flights: flights || [],
      hotels: hotels || [],
      degraded
    }

  }
  //---------------version 2-----------------
  // added weather service with flight and hotel sevice
  //using scatter gather
  // circuit breaker for weather service

  async getInfoWithWeather(startDestination: string, endDestination: string, departTime: string) {
    if (!startDestination || !endDestination || !departTime) {
      this.logger.warn(`Missing fields --> start=${startDestination}, end =${endDestination}, deparTime= ${departTime}`)
      throw new BadRequestException('flight details are required');
    }
    const parseDate = new Date(departTime);

    if (isNaN(parseDate.getTime())) {
      this.logger.warn(`Invalid date format: ${departTime}`)
      throw new BadRequestException('Invalide date format for deparTTime')
    }

    this.logger.log(`Fetching fight, weather, hotel for ${startDestination} --> ${departTime}`)

    const flightPromise = this.callService(
      'localhost',
      3000,
      `/flight?startDestination=${startDestination}&endDestination=${endDestination}&departTime=${departTime}`
    );

    const hotelPromise = this.callService(
      'localhost',
      4000,
      `/hotel?location=${endDestination}`

    );

    const dateStr = parseDate.toISOString().split('T')[0];


    //circuit breaker
    const weatherBreaker = new CircuitBreaker(async () => await this.fetchData(dateStr, endDestination),
      {
        failureThreshold: 0.5,
        requestVolumeThreshold: 20,
        cooldownTime: 30000,
        halfOpenRequests: 5,
        fallback: () => {
          this.logger.warn(`weather service fallback executed `);
          return {
            summary: 'service unavailable',
            degraded: true
          }
        }
      }
    );

    const TOTATL_BUDGET = 1000;
    let flights = null;
    let hotels = null;
    let weather = null;
    let degraded = false;

    try {
      const weatherPromise = weatherBreaker.fire();

      //promise.race([promise1,promise2]).If promise2 wins(the timeout),then it jumps to catch error
      const results = await Promise.race(
        [Promise.all([flightPromise, hotelPromise, weatherPromise]), new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), TOTATL_BUDGET))]
      );

      console.log(results);
      if (Array.isArray(results)) {
        [flights, hotels, weather] = results;
      }
      this.logger.log(`flight + hotel +weather fetched`)
    } catch (error) {
      degraded = true;
      this.logger.warn(`Timeout/degarded mode --> executing fallbacks`)

      flights = await Promise.resolve(flightPromise).catch(() => null);
      hotels = await Promise.resolve(hotelPromise).catch(() => null);

      //we need this catch block,because if the circuit is open we want to show default values
      //if weather is failed or half opened,no need there catch block,bcz fallback take care of it
      weather = (await weatherBreaker.fire().catch(() => ({ summary: 'service unavailable', degraded: true })))


    }
    //when weather is down it calls the fallback. so no error throws,not catch by above catch block
    if (weather && typeof weather === 'object' && 'degraded' in weather && (weather as any).degraded === true) {
      degraded = true;
    }


    return {
      flights: flights || 'no flights found',
      hotels: hotels || 'no hotels found',
      weather: weather || 'no weather result found',
      degraded
    }



  }

  //-------------------------------version 1-----------------
  //hotels+ flight
  //get budget route flights
  //get the late chekin hotels that matches with arrive time
  //chain aggregator pattern used

  async getBudgetRoute(startDestination: string, endDestination: string, departTime: string) {
    if (!startDestination || !endDestination || !departTime) {
      this.logger.warn(`Missing required fields for budget route`);
      throw new BadRequestException('Start, end destination and departTime are required');
    }

    this.logger.log(`Fetching budget route for ${startDestination} → ${endDestination}`);

    const flightResult: any = await this.callService(
      'localhost',
      3000,
      `/flight/getCheapFlight?startDestination=${startDestination}&endDestination=${endDestination}&departTime=${departTime}`
    )
    const hotelResult = await this.callService(
      'localhost',
      4000,
      `/hotel?location=${endDestination}`
    )

    const hotelsWithLateCheckins = Array.isArray(hotelResult) ?
      hotelResult.map((hotel) => {

        //the response comes in string.To get the total time,convert the response to 'date' type
        const flightArrival = new Date(flightResult.arriveTime);

        //arriveTime is in Date data type so use getUTCHours and getUTCMinutes(21:00:00)
        const flightMinutes = flightArrival.getUTCHours() * 60 + flightArrival.getUTCMinutes();

        //as the checkInEndTime is a string but not in full format dateTtime(21:04).only time.So new Date not work
        const [h, m] = hotel.checkInEndTime.split(':').map(Number);
        const hotelMinutes = h * 60 + m;
        console.log("hotel minutes : ", hotelMinutes)
        return {
          ...hotel,
          lateCheckIn: flightMinutes <= hotelMinutes
        }
      })

      : []
    return {
      flight: flightResult,
      hotel: hotelsWithLateCheckins,
    };
  }


  //-----------------------version 1--------------------------
  //flight + hotels +events
  //get events that matches with the end destination
  //branch pattern used

  async getEventInDestination(startDestination: string, endDestination: string, departTime: string) {
    if (!startDestination || !endDestination || !departTime) {
      this.logger.warn(`Missing required fields for events fetch`);
      throw new BadRequestException('Start, end destination and departTime are required');
    }

    this.logger.log(`Fetching events + flight + hotel for ${startDestination} → ${endDestination}`);
    const flightResult: any = await this.callService(
      'localhost',
      3000,
      `/flight?startDestination=${startDestination}&endDestination=${endDestination}&departTime=${departTime}`
    )
    const hotelResult = await this.callService(
      'localhost',
      4000,
      `/hotel?location=${endDestination}`
    )
    const coastalLocations = ['CMB', 'HMBT', 'JFN', 'TRINC', 'GLL', 'MTR']
    const isCoastal = coastalLocations.includes(endDestination);
    let eventResult: any = null

    if (isCoastal) {

      eventResult = await this.callService(
        'localhost',
        3010,
        `/event?location=${endDestination}&category=coastal`
      )


    }else{
      this.logger.log(`Non-coastal destination → skipping event fetch`);
    }

    return {
      flight: flightResult,
      hotel: hotelResult,
      event: eventResult
    }
  }

}

