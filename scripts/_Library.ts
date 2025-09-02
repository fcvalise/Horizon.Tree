import * as hz from "horizon/core";
import { OColor } from "_OColor";

export class Library {
    public static matter = 615081864813295;
    public static matterStatic = 3936638246649448;
    public static shadow = 1325761702246956;


    public static segementStatic = 1061635326176748;
    public static segementDynamic = 629664259903632;
    public static segementIgnoreCast = 1475976320317906;
    public static leafDynamic = 1268992138037283;
    public static leafStatic = 1058120806404332;
    public static treeDescription = 709753422108609;

    public static readonly colorMap: Map<hz.Color, number> = new Map([
        [OColor.LightGreen, 1464325168210012],
        [OColor.DarkGreen,  1966383200779289],
        [OColor.Orange,     2044830499680411],
        [OColor.Black,      1201436798682574],
        [OColor.White,      2217730035333543],
        [OColor.Transparent,2193997667791056],
        [OColor.Grey,       604005912645605],
    ]);
}