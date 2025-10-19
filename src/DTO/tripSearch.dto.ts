import { IsDateString, IsString } from "class-validator"


export class tripSearchDto{
   @IsString()
    startDestination:string

    @IsString()
    endDestination:string

    @IsDateString()
    departTime:string
}