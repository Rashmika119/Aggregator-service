import { Controller, Get, Logger, Query } from '@nestjs/common';
import { AggregatorService } from './aggregator.service';




@Controller()
export class AggregatorController {
  private readonly logger = new Logger(AggregatorController.name);
  constructor(private readonly aggregatorService: AggregatorService,

  ) { }

  //-----------------------------version 1-------------------
  //flight + hotel with scatter gather patter

  @Get('v1/trips/search')
  async getHotelInfo(
    @Query('startDestination') startDestination: string,
    @Query('endDestination') endDestination: string,
    @Query('departTime') departTime: string,
  ) {
    this.logger.log(
      `GET /v1/trips/search called with startDestination=${startDestination}, endDestination=${endDestination}, departTime=${departTime}`,
    );
    return this.aggregatorService.getFlightAndHotelInfo(startDestination, endDestination, departTime);
  }


  //--------------------version 2-------------------
  //weather + flight + hotel with scatter gather

  @Get('v2/trips/search')
  async getHotelInfoWithWeather(
    @Query('startDestination') startDestination: string,
    @Query('endDestination') endDestination: string,
    @Query('departTime') departTime: string,
  ) {
    this.logger.log(
      `GET /v2/trips/search called with startDestination=${startDestination}, endDestination=${endDestination}, departTime=${departTime}`,
    );
    return this.aggregatorService.getInfoWithWeather(startDestination, endDestination, departTime);
  }


  //---------------------version 1----------------------
  //hotels + flight
  //budget route find and the late checkin hotels checking
  //chain pattern

  @Get('v1/trips/cheapest_route')
  async getChepestRouteWithHotels(
    @Query('startDestination') startDestination: string,
    @Query('endDestination') endDestination: string,
    @Query('departTime') departTime: string,
  ) {
    this.logger.log(
      `GET /v1/trips/cheapest_route called with startDestination=${startDestination}, endDestination=${endDestination}, departTime=${departTime}`,
    );
    return this.aggregatorService.getBudgetRoute(startDestination, endDestination, departTime);
  }

  //---------------------------version 1--------------------------
  //flight + hotels + events
  //get events accoring to the destination
  //branch aggregator pattern

  @Get('v1/trips/contextual')
  async getEventsWithHotels(
    @Query('startDestination') startDestination: string,
    @Query('endDestination') endDestination: string,
    //when send data through a url everything treated as astring.no matter the intended type
    @Query('departTime') departTime: string

  ) {
    this.logger.log(
      `GET /v1/trips/contextual called with startDestination=${startDestination}, endDestination=${endDestination}, departTime=${departTime}`,
    );

    //getEventDest method expect Date object
    return this.aggregatorService.getEventInDestination(startDestination, endDestination, departTime);
    ;
  }
}
