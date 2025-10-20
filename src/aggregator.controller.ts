import { Controller, Get, InternalServerErrorException, Logger, Query } from '@nestjs/common';
import { AggregatorService } from './aggregator.service';
import { tripSearchDto } from './DTO/tripSearch.dto';





@Controller()
export class AggregatorController {
  private readonly logger = new Logger(AggregatorController.name);
  constructor(private readonly aggregatorService: AggregatorService,

  ) { }
  

  //-----------------------------version 1-------------------
  //flight + hotel with scatter gather patter

  @Get('v1/trips/search')
  async getHotelInfo(@Query() query: tripSearchDto) {
    this.logger.log(`GET /v1/trips/search called with ${JSON.stringify(query)}`)
    try {
      return this.aggregatorService.getFlightAndHotelInfo(query.startDestination, query.endDestination, query.departTime);
    } catch (error) {
      this.logger.error('Error fetching flights and hotels', error.stack);
      throw new InternalServerErrorException('Failed to fetch flights and hotels');
    }
  }


  //--------------------version 2-------------------
  //weather + flight + hotel with scatter gather

  @Get('v2/trips/search')
  async getHotelInfoWithWeather(@Query() query: tripSearchDto) {
    this.logger.log(
      this.logger.log(`GET /v2/trips/search called with ${JSON.stringify(query)}`),
    );
    try {
      return this.aggregatorService.getInfoWithWeather(query.startDestination, query.endDestination, query.departTime);
    } catch (error) {
      this.logger.error('Error fetching flight, hotel and weather info', error.stack);
      throw new InternalServerErrorException('Failed to fetch flight, hotel and weather info');
    }
  }


  //---------------------version 1----------------------
  //hotels + flight
  //budget route find and the late checkin hotels checking
  //chain pattern

  @Get('v1/trips/cheapest_route')
  async getChepestRouteWithHotels(@Query() query: tripSearchDto) {
    this.logger.log(
      `GET /v1/trips/cheapest_route called with ${JSON.stringify(query)}`,
    );
    try {
      return this.aggregatorService.getBudgetRoute(query.startDestination, query.endDestination, query.departTime);
    } catch (error) {
      this.logger.error('Error fetching cheapest route', error.stack);
      throw new InternalServerErrorException('Failed to fetch cheapest route');
    }
  }

  //---------------------------version 1--------------------------
  //flight + hotels + events
  //get events accoring to the destination
  //branch aggregator pattern

  @Get('v1/trips/contextual')
  async getEventsWithHotels(@Query() query: tripSearchDto) {
    this.logger.log(
      `GET /v1/trips/contextual called with ${JSON.stringify(query)}`,
    );
    try {
      //getEventDest method expect Date object
      return this.aggregatorService.getEventInDestination(query.startDestination, query.endDestination, query.departTime);
    } catch (error) {
      this.logger.error('Error fetching events and hotels', error.stack);
      throw new InternalServerErrorException('Failed to fetch events and hotels');
    }

  }
}
