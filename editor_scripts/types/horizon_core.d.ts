declare module 'horizon/core' {
/**
 * (c) Meta Platforms, Inc. and affiliates. Confidential and proprietary.
 *
 * @format
 */
export declare const ApiVersion = "2.0.0";
interface Class<TConstructorParameters extends any[] = any[], TClassInstance = unknown> {
    new (...args: TConstructorParameters): TClassInstance;
}
/**
 * A list of property types available for a Typescript component. For each variable type, these can be
 * passed to an instance of a Typescript component when attached to an entity.
 */
export declare const PropTypes: {
    /**
     * The property is a TypeScript Number.
     */
    Number: "number";
    /**
     * The property is a TypeScript String.
     */
    String: "string";
    /**
     * The property is a TypeScript Boolean.
     */
    Boolean: "boolean";
    /**
     * The property is a Horizon {@link Vec3}.
     */
    Vec3: "Vec3";
    /**
     * The property is a Horizon {@link Color}.
     */
    Color: "Color";
    /**
     * The property is a Horizon {@link Entity}.
     */
    Entity: "Entity";
    /**
     * The property is a Horizon {@link Quaternion}.
     */
    Quaternion: "Quaternion";
    /**
     * The property is a {@link Player}.
     */
    Player: "Player";
    /**
     * The property is a Horizon {@link Asset}.
     */
    Asset: "Asset";
    /**
     * The property is an array of TypeScript Numbers.
     */
    NumberArray: "Array<number>";
    /**
     * The property is a array of TypeScript Strings.
     */
    StringArray: "Array<string>";
    /**
     * The property is an array of TypeScript Booleans.
     */
    BooleanArray: "Array<boolean>";
    /**
     * The property is an array of Horizon {@link Vec3}s.
     */
    Vec3Array: "Array<Vec3>";
    /**
     * The property is an array of Horizon {@link Color}s.
     */
    ColorArray: "Array<Color>";
    /**
     * The property is an array of Horizon {@link Entity}s.
     */
    EntityArray: "Array<Entity>";
    /**
     * The property is an array of Horizon {@link Quaternion}s.
     */
    QuaternionArray: "Array<Quaternion>";
    /**
     * The property is an array of Horizon {@link Player}s.
     */
    PlayerArray: "Array<Player>";
    /**
     * The property is an array of Horizon {@link Asset}s.
     */
    AssetArray: "Array<Asset>";
};
/**
 * Used to validate the type of a built-in variable.
 */
export declare type BuiltInVariableType = PropTypeFromEnum<AllPropTypes>;
declare type StringifiedBuiltInVariable<T extends BuiltInVariableType> = T extends number ? typeof PropTypes.Number : T extends string ? typeof PropTypes.String : T extends boolean ? typeof PropTypes.Boolean : T extends Vec3 ? typeof PropTypes.Vec3 : T extends Color ? typeof PropTypes.Color : T extends Entity ? typeof PropTypes.Entity : T extends Quaternion ? typeof PropTypes.Quaternion : T extends Player ? typeof PropTypes.Player : T extends Asset ? typeof PropTypes.Asset : T extends Array<number> ? typeof PropTypes.NumberArray : T extends Array<string> ? typeof PropTypes.StringArray : T extends Array<boolean> ? typeof PropTypes.BooleanArray : T extends Array<Vec3> ? typeof PropTypes.Vec3Array : T extends Array<Color> ? typeof PropTypes.ColorArray : T extends Array<Entity> ? typeof PropTypes.EntityArray : T extends Array<Quaternion> ? typeof PropTypes.QuaternionArray : T extends Array<Player> ? typeof PropTypes.PlayerArray : T extends Array<Asset> ? typeof PropTypes.AssetArray : never;
/**
 * Indicates if a method should operate in local or global scope.
 */
export declare enum Space {
    World = 0,
    Local = 1
}
/**
 * Identifies whether the player is visible to other players.
 */
export declare enum PlayerVisibilityMode {
    VisibleTo = 0,
    HiddenFrom = 1
}
/**
 * Asserts that an expression is true.
 * @param condition - The expression that must be true to avoid an error.
 */
export declare function assert(condition: boolean): void;
/**
 * Represents a readable property.
 *
 * @remarks
 * You cannot get the property value directly; you must use `get`.
 * Using `get` typically results in a bridge call and might result in lower performance.
 * Therefore, we recommend caching these values when possible.
 */
export interface ReadableHorizonProperty<T> {
    /**
     * Gets the property value.
     * @returns the property value
     */
    get(): T;
}
/**
 * Represents a writable property.
 *
 * @remarks
 * You cannot set the property value directly; you must use `set`.
 * Using `set` typically results in a bridge call and might result in lower performance.
 * Therefore, we recommend caching these values when possible.
 */
export interface WritableHorizonProperty<T, U = never> {
    /**
     * Sets the value(s) of the property
     * @param value - the new property value
     * @param values - the new property values
     */
    set(value: T, ...values: [U?]): void;
}
/**
 * Represents a readable property, where reads are cached per frame, in Horizon Worlds.
 */
export declare class CachedReadableHorizonProperty<T> implements ReadableHorizonProperty<T> {
    private getter;
    private _lastFrameFetched;
    /**
     * Creates a CachedReadableHorizonProperty instance.
     * @param getter - The function that returns the property value.
     */
    constructor(getter: () => T);
    /**
     * Gets the property value. Calls are cached per frame.
     *
     * @remarks
     * Mutating the state snapshot doesn't change the underlying value.
     * You must call {@link set} set to do this.
     *
     * @returns The current value of the property.
     */
    get(): T;
}
/**
 * Represents a property in Meta Horizon Worlds.
 *
 * @remarks
 * For properties of reference types that perform copy and clone operations
 * ({@link Vec3}, {@link Quaternion}, {@link Color}), use the
 * {@link HorizonReferenceProperty} class.
 */
export declare class HorizonProperty<T> extends CachedReadableHorizonProperty<T> implements WritableHorizonProperty<T> {
    private setter;
    /**
     * Creates a HorizonProperty instance.
     * @param getter - The function that returns the property value.
     * @param setter - The function that sets the property value.
     */
    constructor(getter: () => T, setter: (value: T) => void);
    /**
     * Sets the property value.
     * @remarks There's no guarantee that this is a synchronous operation.
     * @param value - The property value to set.
     */
    set(value: T): void;
}
declare class HorizonSetProperty<T> implements Iterable<T>, ReadableHorizonProperty<T[]>, WritableHorizonProperty<T[]> {
    constructor(getter: () => T[], setter: (value: T[]) => void);
    [Symbol.iterator](): Iterator<T>;
    get(): T[];
    set(value: T[]): void;
    length(): number;
    contains(value: T): boolean;
    clear(): void;
    add(value: T): void;
    remove(value: T): void;
}
/**
 * The type of data that can be passed via local events.
 * This is not restrictive in any way because the data remains in the same VM.
 */
declare type LocalEventData = object;
/**
 * The type of data that can be passed via network events.
 * This data must be serializable because it needs to be sent over the network.
 */
declare type NetworkEventData = SerializableState;
/**
 * Represents events sent to and received from TypeScript event listeners.
 * These are local events that support arbitrary data, but can only be sent to and received from the same client.
 *
 * @remarks
 * We recommend that you use LocalEvent and NetworkEvent to listen to custom events in Horizon.
 * We also recommend that you use CodeBlockEvents to interact with scripting events from the world.
 */
export declare class LocalEvent<TPayload extends LocalEventData = Record<string, never>> {
    /**
     * The name of the event. If a name is not provided, a randomly generated name is assigned
     */
    name: string;
    /**
     * Creates a local event with the specified name.
     * If a name is not provided, the event will become unique and therefore must be referenced
     * by its specific object instance to be listened to. This is useful if your event is going to be used in an
     * asset to avoid collision in consuming worlds.
     * @param name - The name of the event.
     * @remarks
     * We recommend that you use LocalEvent and NetworkEvent to listen to custom events in Horizon.
     * We also recommend that you use CodeBlockEvents to interact with scripting events from the world.
     */
    constructor(name?: string);
}
/**
 * Represents an event sent to and received from event listeners over the network. It can carry
 * any type of data that can be serialized through `JSON.stringify()`.
 *
 * @remarks
 * We recommend that you use LocalEvent and NetworkEvent to listen to custom events in Horizon.
 * We also recommend that you use CodeBlockEvents to interact with scripting events from the world.
 */
export declare class NetworkEvent<TPayload extends NetworkEventData = Record<string, never>> {
    /**
     * The name of the event.
     */
    name: string;
    /**
     * Creates a Horizon event with the specified name.
     * @param name - The name of the event.
     */
    constructor(name: string);
}
declare type ConstrainedPropTypes<T extends BuiltInVariableType[]> = {
    [key in keyof T]: StringifiedBuiltInVariable<T[key]>;
};
/**
 * Represents an event within the Code Block scripting system in Horizon. These events can be sent and received
 * both locally and over the network, and only support predefined serializable types. These are less performant then LocalEvent,
 * so use them with care.
 *
 * @remarks
 * We recommend that you use LocalEvent and NetworkEvent to listen to custom events in Horizon.
 * We also recommend that you use CodeBlockEvents to interact with scripting events from the world.
 */
export declare class CodeBlockEvent<T extends BuiltInVariableType[]> {
    /**
     * The name of the event.
     */
    name: string;
    /**
     * A list of possible types of the event.
     */
    expectedTypes: ConstrainedPropTypes<T> | [];
    /**
     * Creates a CodeBlockEvent.
     * @param name - The name of the event.
     * @param expectedTypes - The list of possible types of the event.
     * @remarks Each of these types defines the parameters for the event and must be of type {@link PropType}.
     */
    constructor(name: string, expectedTypes: ConstrainedPropTypes<T> | []);
}
/**
 * Represents what is returned from subscribing to an event.
 */
export interface EventSubscription {
    /**
     * Disconnect from an event listener so that you no longer receive events.
     */
    disconnect: () => void;
}
/**
 * The Comparable interface defines a set of methods for comparing values of the same type,
 * including {@link Comparable.equals | equals()} and {@link Comparable.equalsApprox | equalsApprox()} methods.
 *
 * @typeParam T - The type of objects to which this object can be compared.
 */
export interface Comparable<T> {
    /**
     * Whether the two values are equal.
     * @param val - The value to compare to the current value.
     */
    equals(val: T): boolean;
    /**
     * Whether two values are within epsilon of each other.
     * @param val - The value to compare to the current value.
     * @param epsilon - The difference between the two values when they are equal.
     */
    equalsApprox(val: T, epsilon?: number): boolean;
}
/**
 * Represents a 3D vector.
 */
export declare class Vec3 implements Comparable<Vec3> {
    /**
     * The magnitude of the 3d vector along the X axis.
     */
    x: number;
    /**
     * The magnitude of the 3D vector along the Y axis.
     */
    y: number;
    /**
     * The magnitude of the 3D vector along the Z axis.
     */
    z: number;
    /**
     * Creates a 3D vector.
     * @param x - The magnitude of the 3D vector along the X axis.
     * @param y - The magnitude of the 3D vector along the Y axis.
     * @param z - The magnitude of the 3D vector along the Z axis.
     */
    constructor(x: number, y: number, z: number);
    /**
     * Clone this 3D vector's value into a mutable Vec3.
     * @returns a mutable Vec3 with our same x,y,z values.
     */
    clone(): Vec3;
    /**
     * Compares the equality of a 3D vector to the given 3D vector.
     * @param vec - 3D vector to compare
     * @returns true if the corresponding x, y, and z values all match; false otherwise.
     */
    equals(vec: Vec3): boolean;
    /**
     * Compares the approximate equality of a 3D vector to the given 3D vector
     * @param vec - 3D vector to compare
     * @param epsilon - maxium difference in value to be considered equal
     * @returns true if the corresponding x, y, and z values are within epsilon; false otherwise.
     */
    equalsApprox(vec: Vec3, epsilon?: number): boolean;
    /**
     * Gets the magnitude of a 3D vector.
     * @returns The magnitude of the 3D vector.
     */
    magnitude(): number;
    /**
     * Gets the squared magnitude of a 3D vector.
     * @returns
     */
    magnitudeSquared(): number;
    /**
     * Gets the distance between the current 3D vector and another 3D vector.
     * @param vec - The 3D vector to compute the distance.
     * @returns The distance between the two 3D vectors.
     */
    distance(vec: Vec3): number;
    /**
     * The squared distance between the current 3D vector and another 3D vector.
     * @param vec - The 3D vector to compute squared distance between.
     * @returns The squared distance between the two 3D vectors.
     */
    distanceSquared(vec: Vec3): number;
    /**
     * Gets the x, y, z values for the 3D vector.
     * @returns The x, y, and z values for the 3D vector.
     */
    toString(): string;
    /**
     * Creates a copy of the specified 3D vector,
     * with the same x, y, and z values.
     * @param vec - The 3D vector to copy.
     * @returns A new 3D 3D vector.
     */
    copy(vec: Vec3): this;
    /**
     * Creates a 3D vector that by adding another 3D vector to the current 3D vector.
     * @param vec - The 3D vector to add.
     * @returns A new 3D vector.
     */
    add(vec: Vec3): Vec3;
    /**
     * Creates a 3D vector by subtracting another 3D vector from the current 3D vector.
     * @param vec - The 3D vector to subtract.
     * @returns A new 3D vector.
     */
    sub(vec: Vec3): Vec3;
    /**
     * Creates a 3D vector by multiplying the current 3D vector by scalar.
     * @param scalar - The scalar to multiply.
     * @returns A new 3D vector.
     */
    mul(scalar: number): Vec3;
    /**
     * Creates a 3D vector multiplying the current 3D vector's components by another 3D vector's components.
     * (a.x*b.x, a.y*b.y, a.z*b.z)
     * @param vec - The 3D vector to multiply.
     * @returns A new 3D vector.
     */
    componentMul(vec: Vec3): Vec3;
    /**
     * Creates a 3D vector dividing the current 3D vector by a scalar.
     * @param scalar - The scalar to divide.
     * @returns A new 3D vector.
     */
    div(scalar: number): Vec3;
    /**
     * Creates a 3D vector by dividing the current 3D vector's components by another 3D vector's components
     * (a.x/b.x, a.y/b.y, a.z/b.z).
     * @param vec - The vec to divide.
     * @returns A new 3D vector.
     */
    componentDiv(vec: Vec3): Vec3;
    /**
     * Creates a 3D vector by normalizing the current 3D vector.
     * @returns A new 3D vector.
     */
    normalize(): Vec3;
    /**
     * Gets the dot product of the current 3D vector and another 3D vector.
     * @param vec - The 3D vector to compute the dot product with.
     * @returns The dot product of the two 3D vectors.
     */
    dot(vec: Vec3): number;
    /**
     * Gets the cross product of the current 3D vector and another 3D vector.
     * @param vec - The 3D vector to compute the cross product with.
     * @returns The cross product of the two 3D vectors.
     */
    cross(vec: Vec3): Vec3;
    /**
     * Creates a 3D vector by reflecting the current 3D vector on the given normal.
     * @param normal - The normal of the reflecting surface. This is assumed to be normalized.
     * @returns A new 3D vector.
     */
    reflect(normal: Vec3): Vec3;
    /**
     * Adds a 3D vector to the current 3D vector, modifying the original 3D vector in place.
     * @param vec - The 3D vector to add.
     */
    addInPlace(vec: Vec3): this;
    /**
     * Subtracts a 3D vector from the current 3D vector, modifying the original 3D vector in place.
     * @param vec - The 3D vector to subtract.
     */
    subInPlace(vec: Vec3): this;
    /**
     * Multiplies the current 3D vector by a scalar value, modifying the original 3D vector in place.
     * @param scalar - The value to scale the 3D vector by.
     */
    mulInPlace(scalar: number): this;
    /**
     * Muliplies the current 3D vector by another 3D vector, modifying the original 3D vector in place.
     * @param vec - The 3D vector to multiply.
     */
    componentMulInPlace(vec: Vec3): this;
    /**
     * Divides the current 3D vector by a scalar value, modifying the original 3D vector in place.
     * @param scalar - The value to scale the 3D vector by.
     */
    divInPlace(scalar: number): this;
    /**
     * Divides the current 3D Vector by another 3D vector, modifying the original 3D vector in place.
     * @param vec - The 3D vector to divide the current 3D vector by.
     */
    componentDivInPlace(vec: Vec3): this;
    /**
     * Normalizes the current 3D vector in place.
     */
    normalizeInPlace(): this;
    /**
     * Updates the current 3D vector with a cross product with another 3D vector, modifying the original 3D vector in place.
     * @param vec - The 3D vector to compute the cross product with.
     */
    crossInPlace(vec: Vec3): this;
    /**
     * Updates the current 3D vector with a normal of a reflecting surface, modifying the original 3D vector in place.
     * @param normal - The normal of the reflecting surface. This is assumed to be normalized.
     */
    reflectInPlace(normal: Vec3): this;
    static get zero(): Vec3;
    static get one(): Vec3;
    static get forward(): Vec3;
    static get up(): Vec3;
    static get left(): Vec3;
    static get right(): Vec3;
    static get backward(): Vec3;
    static get down(): Vec3;
    /**
     * Determines whether two 3D vectors are equal.
     * @param vecA - The first 3D vector to compare.
     * @param vecB - The second 3D vector to compare.
     * @returns `true` if the 3D vectors are equal; `false` otherwise.
     */
    static equals(vecA: Vec3, vecB: Vec3): boolean;
    /**
     * Determines whether two 3D vectors are relatively equal.
     * @param vecA - The first 3D vector to compare.
     * @param vecB - The second 3D vector to compare.
     * @param epsilon - The maxium difference in value to be considered equal.
     * @returns `true` if the 3D vectors are relatively equal; `false` otherwise.
     */
    static equalsApprox(vecA: Vec3, vecB: Vec3, epsilon?: number): boolean;
    /**
     * Adds two 3D vectors, returning a new 3D vector.
     * @param vecA - The first 3D vector to add.
     * @param vecB - The second 3D vector to add.
     * @param outVec - The resulting 3D vector. If not supplied, a new 3D vector is created and returned.
     * @returns A new 3D vector.
     */
    static add(vecA: Vec3, vecB: Vec3, outVec?: Vec3): Vec3;
    /**
     * Subtracts a 3D vector from another, returning a new 3D vector.
     * @param vecA - The 3D vector to substract from.
     * @param vecB - The 3D vector to subtract.
     * @param outVec - The new 3D vector as a result of the operation. If not supplied, a new 3D vector is created and returned.
     * @returns A new 3D vector, if `outVec` is not supplied.
     */
    static sub(vecA: Vec3, vecB: Vec3, outVec?: Vec3): Vec3;
    /**
     * Performs a scalar multiplication on a 3D vector, returning a new 3D vector.
     * @param vec - The 3D vector to scale.
     * @param scalar - The value to scale the 3D vector by.
     * @param outVec - The new 3D vector as a result of the operation. If not supplied, a new 3D vector is created and returned.
     * @returns A new 3D vector, if `outVec` is not supplied.
     */
    static mul(vec: Vec3, scalar: number, outVec?: Vec3): Vec3;
    /**
     * Performs a scalar division on a 3D vector, returning a new 3D vector.
     * @param vec - The 3D vector to scale.
     * @param scalar - The value to scale the 3D vector by.
     * @param outVec - The new 3D vector as a result of the operation. If not supplied, a new 3D vector is created and returned.
     * @returns A new 3D vector, if `outVec` is not supplied.
     */
    static div(vec: Vec3, scalar: number, outVec?: Vec3): Vec3;
    /**
     * Normalizes a 3D vector, returning a new 3D vector.
     * @param vec - The 3D vector to normalize
     * @param outVec - The new 3D vector as a result of the operation. If not supplied, a new 3D vector is created and returned.
     * @returns A new 3D vector, if `outVec` is not supplied.
     */
    static normalize(vec: Vec3, outVec?: Vec3): Vec3;
    /**
     * Computes the cross product of two 3D vectors, returning a new 3D vector.
     * @param vecA - The left side 3D vector of the cross product.
     * @param vecB - The right side 3D vector of the cross product.
     * @param outVec - The new 3D vector as a result of the operation. If not supplied, a new 3D vector is created and returned.
     * @returns A new 3D vector, if `outVec` is not supplied.
     */
    static cross(vecA: Vec3, vecB: Vec3, outVec?: Vec3): Vec3;
    /**
     * Gets the dot product of the two provided 3D vectors.
     * @param vecA - The first 3D vector of the dot product.
     * @param vecB - The second 3D vector of the dot product.
     * @returns The dot product of the two 3D vectors.
     */
    static dot(vecA: Vec3, vecB: Vec3): number;
    /**
     * Performs a lerp (linear interpolation) between two 3D vectors.
     * @param vecA - The first vec3 to lerp.
     * @param vecB - The second vec3 to lerp.
     * @param amount - The gradient to use for interpolation (clamped 0 to 1)
     * @param outVec - The new 3D vector as a result of the operation. If not supplied, a new 3D vector is created and returned.
     * @returns A new 3D vector, if `outVec` is not supplied.
     */
    static lerp(vecA: Vec3, vecB: Vec3, amount: number, outVec?: Vec3): Vec3;
}
/**
 * Represents an RGB color.
 */
export declare class Color implements Comparable<Color> {
    /**
     * The red component of the RGB color.
     */
    r: number;
    /**
     * The green component of the RGB color.
     */
    g: number;
    /**
     * The blue component of the RGB color.
     */
    b: number;
    /**
     * Creates an RGB color object.
     * @param r - The red component of the RGB color as a float from 0 to 1.
     * @param g - The green component of the RGB color as a float from 0 to 1.
     * @param b - The blue component of the RGB color as a float from 0 to 1.
     */
    constructor(r: number, g: number, b: number);
    /**
     * Gets a string listing the RGB color components.
     * @returns A list of the components.
     */
    toString(): string;
    /**
     * Clones the current RGB color's values into a mutable RGB color object.
     * @returns a mutable RGB color with the same r, g, b values.
     */
    clone(): Color;
    /**
     * Converts a RGB color to an HSV (hue, saturation, value) 3D vector.
     * @returns A 3D vector, where x is the hue, y is the saturation, and z is the value of the color.
     */
    toHSV(): Vec3;
    /**
     * Converts a RGB color to a Hex color code.
     * @returns The hex color code of the color.
     */
    toHex(): `#${string}`;
    /**
     * Converts a hex code string to a Color.
     * @param hex - A six-character hex code string prefixed with #, ie: "#ff0000".
     * @returns A Color representing the hex value.
     */
    static fromHex(hex: string): Color;
    /**
     * Gets the values of the current RGB color object as a 3D vector.
     */
    toVec3(): Vec3;
    /**
     * Determines whether the current RGB color is the same as the specified RGB color.
     * @param color - The RGB color to compare.
     * @returns `true` if the r, g, b values are equal; `false` otherwise.
     */
    equals(color: Color): boolean;
    /**
     * Determines whether the current RGB color is approxiamately the same as the specified RGB color.
     * @param color - The RGB color to compare.
     * @param epsilon - The maxium difference in value to be considered equal.
     * @returns `true` if the colors are approximately equal; `false` othewise.
     */
    equalsApprox(color: Color, epsilon?: number): boolean;
    /**
     * Sets the current RGB color to the specified RGB color.
     * @param color - The specified RGB color.
     */
    copy(color: Color): this;
    /**
     * Creates an RGB color by adding an RGB color to the current RGB color.
     * @param color - The RGB color to add.
     * @returns A new RGB color.
     */
    add(color: Color): Color;
    /**
     * Adds an RGB color to the current RGB color, modifying the original color in place.
     * @param color - The RGB color to add.
     */
    addInPlace(color: Color): this;
    /**
     * Creates an RGB color by subtracting an RGB color from the current RGB color.
     * @param color - The color to subtract.
     * @returns A new RGB color.
     */
    sub(color: Color): Color;
    /**
     * Subtracts an RGB color from the current RGB color, modifying the original RGB color in place.
     * @param color - The RGB color to subtract.
     */
    subInPlace(color: Color): this;
    /**
     * Creates an RGB color by multiplying a scalar with each component of the current RGB color.
     * @param scalar - The scalar to multiply.
     * @returns A new RGB color.
     */
    mul(scalar: number): Color;
    /**
     * Performs a scalar multiplication on the current RGB color, modifying the original RGB color in place.
     * @param scalar - The value to scale the color by.
     */
    mulInPlace(scalar: number): this;
    /**
     * Creates an RGB color by multiplying each component of the current RGB color with the input RGB color's component.
     * @param color - The RGB color to multiply.
     * @returns A new RGB color.
     */
    componentMul(color: Color): Color;
    /**
     * Multiplies the current RGB color's components by the specified RGB color's components, modifying the original RGB color in place.
     * @param color - The RGB color to multiply by.
     */
    componentMulInPlace(color: Color): this;
    /**
     * Creates an RGB color by dividing each component of the current color by a scalar value.
     * @param scalar - The scalar to divide by.
     * @returns A new RGB color.
     */
    div(scalar: number): Color;
    /**
     * Divides an RGB color's components by a scalar value, modifying the original RGB color in place.
     * @param scalar - The value to scale the color by.
     */
    divInPlace(scalar: number): this;
    /**
     * Creates a red RGB color.
     */
    static get red(): Color;
    /**
     * Creates a green RGB color.
     */
    static get green(): Color;
    /**
     * Creates a blue RGB color.
     */
    static get blue(): Color;
    /**
     * Creates a white RGB color.
     */
    static get white(): Color;
    /**
     * Creates a black RGB color.
     */
    static get black(): Color;
    /**
     * Determines whether two RGB colors are equal.
     * @param colorA - The first RGB color to compare.
     * @param colorB - The second RGB color to compare.
     * @returns `true` if the RGB colors are equal, `false` otherwise.
     */
    static equals(colorA: Color, colorB: Color): boolean;
    /**
     * Determines whether two RGB colors are approximately equal.
     * @param colorA - The first RGB color to compare.
     * @param colorB - The second RGB color to compare.
     * @param epsilon - The maximum difference in value to be considered equal.
     * @returns `true` if the two RGB colors are approximatel equal, `false` otherwise.
     */
    static equalsApprox(colorA: Color, colorB: Color, epsilon?: number): boolean;
    /**
     * Adds two RGB colors, returning a new RGB color.
     * @param colorA - The first RGB color to add.
     * @param colorB - The second color to add.
     * @param outColor - The RGB color as a result of the operation. If not supplied, a new RGB color is created and returned.
     * @returns A new RGB color, if `outColor` is not supplied.
     */
    static add(colorA: Color, colorB: Color, outColor?: Color): Color;
    /**
     * Subtracts an RGB color from another RGB color, returning a new RGB color.
     * @param colorA - The RGB color to subtract from.
     * @param colorB - The RGB color to subtract.
     * @param outColor - The new color as a result of the operation. If not supplied, a new 3D vector is created and returned.
     * @returns A new RGB color, if `outColor` is not supplied.
     */
    static sub(colorA: Color, colorB: Color, outColor?: Color): Color;
    /**
     * Performs a scalar multiplication on an RGB color, returning a new RGB color.
     * @param color - The RGB color to scale.
     * @param scalar - The value to scale the RGB color by.
     * @param outColor - The new color as a result of the operation. If not supplied, a new 3D vector is created and returned.
     * @returns A new RGB color.
     */
    static mul(color: Color, scalar: number, outColor?: Color): Color;
    /**
     * Performs scalar division on an RGB color, returning a new RGB color.
     * @param color - The RGB color to scale.
     * @param scalar - The value to scale the RGB color by.
     * @param outColor - The new color as a result of the operation. If not supplied, a new 3D vector is created and returned.
     * @returns A new RGB color.
     */
    static div(color: Color, scalar: number, outColor?: Color): Color;
    /**
     * Creates a new RGB color from an HSV value.
     * @param hsv - The HSV color value to convert to RGB.
     * @returns A new RGB color.
     */
    static fromHSV(hsv: Vec3): Color;
}
/**
 * Defines the orientation of the x, y, z axis in space.
 */
export declare enum EulerOrder {
    /**
     * The orientation is XYZ.
     */
    XYZ = "XYZ",
    /**
     * The orientation is YXZ.
     */
    YXZ = "YXZ",
    /**
     * The orientation is ZXY.
     */
    ZXY = "ZXY",
    /**
     * The orientation is ZYX.
     */
    ZYX = "ZYX",
    /**
     * The orientation is YZX.
     */
    YZX = "YZX",
    /**
     * The orientation is XZY.
     */
    XZY = "XZY"
}
/**
 * Clamps a value between a minimum value and a maximum value.
 * @param value - The value to clamp.
 * @param min - The minimum value.
 * @param max - The maxium value.
 * @returns The clamped value.
 */
export declare function clamp(value: number, min: number, max: number): number;
/**
 * Converts radians to degrees
 * @param radians - value in radians
 * @returns value in degrees
 */
export declare function radiansToDegrees(radians: number): number;
/**
 * Converts degrees to radians
 * @param degrees - value in degrees
 * @returns value in radians
 */
export declare function degreesToRadians(degrees: number): number;
/**
 * Represents a quaternion (a four-element vector defining the orientation of a 3D point in space).
 */
export declare class Quaternion implements Comparable<Quaternion> {
    /**
     * The x component of the quaternion.
     */
    x: number;
    /**
     * The y component of the quaternion.
     */
    y: number;
    /**
     * The z component of the quaternion.
     */
    z: number;
    /**
     * The w component of the quaternion.
     */
    w: number;
    /**
     * Creates a quaternion.
     * @param x - The x component of the quaternion.
     * @param y - The y component of the quaternion.
     * @param z - The z component of the quaternion.
     * @param w - The w component of the quaternion.
     */
    constructor(x: number, y: number, z: number, w: number);
    /**
     * Gets a human-readable represention of the quaternion.
     * @returns a string representation of the quaternion.
     */
    toString(): string;
    /**
     * Creates a copy of the quaternion.
     * @returns The new quaternion.
     */
    clone(): Quaternion;
    /**
     * Converts the quaternion to an Euler angle in degrees.
     * @param order - The order of the resulting Vec3 defaults to XYZ.
     * @returns A Vec3 that represents the Euler angle (in degrees).
     */
    toEuler: (order?: EulerOrder) => Vec3;
    /**
     * Determines whether the quaternion is equal to another quaternion. A quaternion is equal to another
     * quaternion if its components are equal or if the negation of its components are equal.
     * @param quat - The quaternion to compare.
     * @returns True if the quaternion is equal to the other quaternion; otherwise, false.
     */
    equals(quat: Quaternion): boolean;
    /**
     * Determines whether the current quaternion is approximately equal to another quaternion. A quaternion is equal
     * to another quaternion if its components are equal or if the negation of its components are equal.
     * @param quat - The other quaternion.
     * @param epsilon - The maxium difference in values to consider approximately equal.
     * @returns true if the quaternion is approximately equal to the other quaternion; otherwise, false.
     */
    equalsApprox(quat: Quaternion, epsilon?: number): boolean;
    /**
     * Gets the axis of the rotation represented by the quaternion.
     * @returns The vector that represents the axis.
     */
    axis(): Vec3;
    /**
     * Gets the angle, in radians, of rotation represented by the quaternion.
     * @returns The angle in radians.
     */
    angle(): number;
    /**
     * Updates the values of the quaternion with the values of another quaterium.
     * @param quat - The quaternion to copy.
     * @returns The updated quaternion.
     */
    copy(quat: Quaternion): this;
    /**
     * Creates a quaternion that's the inverse of the current quaternion.
     * @returns The new quaternion.
     */
    inverse(): Quaternion;
    /**
     * Updates the current quaternion with its inverse values.
     * @returns The updated quaternion.
     */
    inverseInPlace(): this;
    /**
     * Gets a normalized copy of the current quaternion.
     * @returns The new quaternion.
     */
    normalize(): Quaternion;
    /**
     * Updates the current quaterion with its normalized values.
     * @returns The updated quaternion
     */
    normalizeInPlace(): this;
    /**
     * Gets a conjugated copy of the current quaternion.
     * @returns The new quaternion.
     */
    conjugate(): Quaternion;
    /**
     * Updates the current quaternion with its conjugated values.
     * @returns The updated quaterion.
     */
    conjugateInPlace(): this;
    /**
     * Multiplies the current quaternion by another quaternion and returns the result
     * as a new quaternion.
     * @param quat - The quaternion to use as the multiplier.
     * @returns The new quaternion.
     */
    mul(quat: Quaternion): Quaternion;
    /**
     * Updates the current quaternion by multiplying it by another quaternion.
     * @param quat - The quaternion to use as the multiplier.
     * @returns The current quaternion.
     */
    mulInPlace(quat: Quaternion): this;
    /**
     * Creates a zero element quaternion.
     * @returns The new quaternion.
     */
    static get zero(): Quaternion;
    /**
     * Creates a unit quaternion [0,0,0,1].
     * @returns The new quaternion.
     */
    static get one(): Quaternion;
    /**
     * Creates a quaternion representing a rotation around the X-axis. Axis is not normalized.
     * @returns The new quaternion.
     */
    static get i(): Quaternion;
    /**
     * Creates a quaternion representing a rotation around the Y-axis. The axis is not normalized.
     * @returns The new quaternion.
     */
    static get j(): Quaternion;
    /**
     * Creates a quaternion representing a rotation around the Z-axis. The axis is not normalized.
     * @returns The Z quaternion.
     */
    static get k(): Quaternion;
    /**
     * Determines whether two quaternions are equal.
     * A quaternion is equal to another quaternion if its components are equal or if the negation of its components are equal.
     * @param quatA - The first quaternion to compare.
     * @param quatB - The second quaternion to compare.
     * @returns true if the quaternions are equal; otherwise, false.
     */
    static equals(quatA: Quaternion, quatB: Quaternion): boolean;
    /**
     * Compares the approximate equality between two quaternions.
     * A quaternion is equal to another quaternion if its components are equal or if the negation of its components are equal.
     * @param quatA - The first quaternion to compare.
     * @param quatB - The second quaternion to compare.
     * @param epsilon - The maxium difference in values to consider approximately equal.
     * @returns true if the quaternions are approximately equal; otherwise, false.
     */
    static equalsApprox(quatA: Quaternion, quatB: Quaternion, epsilon?: number): boolean;
    /**
     * Creates a quaternion from a Euler angle.
     * @param euler - The Euler angle in degrees.
     * @param order - The order of the Euler angle. The default order is XYZ.
     */
    static fromEuler(euler: Vec3, order?: EulerOrder): Quaternion;
    /**
     * Creates a quaternion using forward and up 3D vectors.
     * @param forward - The forward direction of rotation; must be orthogonal to up.
     * @param up - The up direction of rotation; must be orthogonal to forward. The
     * default value is Vec3.up.
  
     * @param outQuat - The quaternion to perform the operation on. If not supplied,
     * a new quaternion is created and returned.
     * @returns The quaternion aimed at the provided 3D vectors.
     */
    static lookRotation(forward: Vec3, up?: Vec3, outQuat?: Quaternion): Quaternion;
    /**
     * Peforms slerp (spherical linear interpolation) between two quaternions.
     * @param left - The leftmost quaternion.
     * @param right - The rightmost quaternion.
     * @param amount - Defines the gradient to use for interpolation, clamped 0 to 1.
     * @param outQuat - The quaternion to perform the operation on. If this isn't supplied,
     * a new quaternion is created and returned.
     * @returns A new interpolated quaternion.
     */
    static slerp(left: Quaternion, right: Quaternion, amount: number, outQuat?: Quaternion): Quaternion;
    /**
     * Gets a quaternion that is the product of two quaternions.
     * @param quatA - The first quaternion to multiply.
     * @param quatB - The second uaternion to multiply.
     * @param outQuat - The quaternion to perform the operation on. If this isn't supplied,
     * a new quaternion is created and returned.
     * @returns A new quaternion.
     */
    static mul(quatA: Quaternion, quatB: Quaternion, outQuat?: Quaternion): Quaternion;
    /**
     * Creates a copy of a 3D vector and then rotates the copy by a quaternion.
     * @param quat - The quaternion to use for the rotation.
     * @param vec - 3D vector to copy.
     * @returns The new rotated 3D vector.
     */
    static mulVec3: (quat: Quaternion, vec: Vec3) => Vec3;
    /**
     * Creates a quaternion that is the conjugation of a quaternion.
     * @param quat - The quaternion to conjugate.
     * @param outQuat - The quaternion to perform the operation on. If this isn't supplied,
     * a new quaternion is created and returned.
     * @returns The new quaternion.
     */
    static conjugate(quat: Quaternion, outQuat?: Quaternion): Quaternion;
    /**
     * Gets a new quaternion that is the inverse of the specified quaternion.
     * @param quat - The specified quaternion.
     * @returns The new quaternion.
     */
    static inverse(quat: Quaternion): Quaternion;
    /**
     * Gets a new quaternion that is the normalized version of the specified quaternion.
     * @param quat - The specified quaternion.
     * @param outQuat - The quaternion to perform the operation on. If this isn't supplied,
     * a new quaternion is created and returned.
     * @returns The new normalized quaternion.
     */
    static normalize(quat: Quaternion, outQuat?: Quaternion): Quaternion;
    /**
     * Creates a quaternion from a 3D vector, where w is 0.
     * @param vec - The 3D vector to create the quaternion from.
     * @returns The new quaternion.
     */
    static fromVec3(vec: Vec3): Quaternion;
    /**
     * Creates a quaternion from an axis angle.
     * @param axis - The axis to rotate around.
     * @param angle - The angle, in radians of rotation.
     * @returns The new quaternion.
     */
    static fromAxisAngle: (axis: Vec3, angle: number) => Quaternion;
}
/**
 * Represents an axis aligned bounding box with a center position,
 * and extents which are the distance from the center to the corners
 */
export declare class Bounds {
    /**
     * The position of the bounds.
     */
    center: Vec3;
    /**
     * The distance from center to min/max of the bounds.
     */
    extents: Vec3;
    /**
     * Get the position of the minimum corner of the bounds
     * @returns the minimum point of the bounds
     */
    min(): Vec3;
    /**
     * Get the position of the maximum corner of the bounds
     * @returns the maximum point of the bounds
     */
    max(): Vec3;
    /**
     * Get the size of the box, which is twice the extents
     * @returns The size of the bounding box
     */
    size(): Vec3;
    /**
     * Creates a bounds object.
     * @param center - The center of the bounds.
     * @param extents - 1/2 the size of the bounds.
     */
    constructor(center: Vec3, extents: Vec3);
}
export declare class ConstructorCache {
    private _cache;
    get<T>(id: number | string | bigint, fallback: T): T;
    clear(): void;
    get size(): number;
}
/**
 * Represents a transform for a single entity.
 */
export declare class Transform {
    private _entity;
    constructor(entity: Entity);
    position: HorizonProperty<Vec3>;
    /**
     * Represents the current scale of the entity in the world.
     */
    scale: ReadableHorizonProperty<Vec3>;
    /**
     * Represents the current rotation component of the entity in the world.
     */
    rotation: HorizonProperty<Quaternion>;
    /**
     * Represents the current local position of the entity relative to its parent.
     */
    localPosition: HorizonProperty<Vec3>;
    /**
     * Represents the current local scale of the entity relative to its parent.
     */
    localScale: HorizonProperty<Vec3>;
    /**
     * Represents the current rotation component of the entity relative to its parent.
     */
    localRotation: HorizonProperty<Quaternion>;
}
/**
 * Represents an entity in a world.
 */
export declare class Entity {
    /**
     * The ID of the entity in the world.
     */
    readonly id: bigint;
    /**
     * The transform of the entity, which contains position, rotation, and
     * scale information.
     */
    readonly transform: Transform;
    /**
     * Creates an entity in the world.
     *
     * @param id - The ID of the entity to create.
     *
     * @returns The new entity.
     */
    constructor(id: bigint);
    /**
     * Gets a human-readable representation of the entity.
     *
     * @returns A string representing the entity.
     */
    toString(): string;
    /**
     * The human readable name of the entity.
     */
    name: ReadableHorizonProperty<string>;
    /**
     * The parent of the entity.
     */
    parent: ReadableHorizonProperty<Entity | null>;
    /**
     * The child entities of the entity.
     */
    children: ReadableHorizonProperty<Entity[]>;
    /**
     * The current position of the entity in the world.
     */
    position: HorizonProperty<Vec3>;
    /**
     * The current scale of the entity in the world.
     */
    scale: HorizonProperty<Vec3>;
    /**
     * The rotation component of the entity.
     */
    rotation: HorizonProperty<Quaternion>;
    /**
     * The color of the entity.
     */
    color: HorizonProperty<Color>;
    /**
     * The forward vector of the entity.
     */
    forward: ReadableHorizonProperty<Vec3>;
    /**
     * The up vector of the entity.
     */
    up: ReadableHorizonProperty<Vec3>;
    /**
     * The right vector of the entity.
     */
    right: ReadableHorizonProperty<Vec3>;
    /**
     * Indicates whether players with permission can see the entity. true if players
     * with permission can see the entity; false if no players can see the entity.
     *
     * @remarks
     *
     * You can set which players have permission using
     * {@link Entity.setVisibilityForPlayers}. It's important to note that if any
     * parent entity has its visibility set to false, the child entity will also be
     * invisible regardless of its own visibility setting.
     *
     * @example
     * ```
     * const wasVisible: boolean = cubeEntity.visible.get();
     * cubeEntity.visible.set(!wasVisible);
     * ```
     */
    visible: HorizonProperty<boolean>;
    /**
     * Indicates whether the entity is collidable. true if the entity is collidable;
     * otherwise, false.
     */
    collidable: HorizonProperty<boolean>;
    /**
     * Determines whether grabbing and physics is calculated. If simulated is off, then objects aren't
     * grabbable and aren't affected by physics.
     */
    simulated: HorizonProperty<boolean>;
    /**
     * The interaction mode for the entity, such as whether it's grabble or supports physics.
     */
    interactionMode: HorizonProperty<EntityInteractionMode>;
    /**
     * The {@link Player} that owns the entity.
     *
     * @remarks When changing entity ownership to a new player, you must transfer
     * the state of the entity as well or the state will be lost. You can use the
     * {@link Component.transferOwnership} and {@link Component.receiveOwnership}
     * methods to transfer an entity's state to a new owner. For more information,
     * see {@link https://developers.meta.com/horizon-worlds/learn/documentation/typescript/local-scripting/maintaining-local-state-on-ownership-change}.
     *
     * If ownership for a parent entity changes, the ownership change doesn't
     * automatically apply to any child entities.
     */
    owner: HorizonProperty<Player>;
    /**
     * Use tags to annotate entities with user-defined labels that identify and match objects.
     *
     * @remarks
     * You can have up to five tags per entity. Each tag can be up to 20 characters long.
     * Tags are case sensitive. Avoid using special characters. There is no check for duplicate tags.
     * Tags set or modified in TypeScript only presist for the session; they are not be stored in the
     * entity.
     *
     * @privateremarks
     * Tags are stored as a concatenated string due to entity states not supporting arrays yet.
     * We should migrate the gameplayTags field to an array as soon as that is possible.
     *
     * @example
     * ```
     * entity.tags.set(['tag1', 'tag2']);
     * const tags: Array<string> = entity.tags.get();
     * const containsTag1: boolean = entity.tags.contains('tag1');
     * entity.tags.remove('tag1');
     * entity.tags.clear();
     * ```
     */
    tags: HorizonSetProperty<string>;
    /**
     * Indicates whether the entity exists in the world. true if the entity exists in the
     * world; otherwise, it does not exist in the world.
     *
     * @returns A boolean that indicates whether the entity exists in the world.
     */
    exists(): boolean;
    /**
     * Cast an entity as its more specific subclass.
     *
     * @param entityClass - The subclass to cast entity to.
     */
    as<T extends Entity>(entityClass: Class<[bigint], T>): T | null;
    /**
     * Makes an Entity visible or hidden only for a set of players within a world instance.
     * @param players - An array of Player objects to set the visibility mode for.
     * @param mode - true to make the entity visible only to the specified players; false to hide
     * the entity only from those players.
     *
     * @remarks
     * Even if a player's visibility is enabled with this method, they won't be able to
     * see the entity unless its `visible` property is set to `true`.
     *
     * @example
     * cubeEntity.setVisibilityForPlayers([myPlayer], PlayerVisibilityMode.VisibleTo);
     */
    setVisibilityForPlayers(players: Array<Player>, mode: PlayerVisibilityMode): void;
    /**
     * Makes the entity visible to all players in the world instance, which resets any
     * changes made by calls to the {@link setVisibilityForPlayers} method.
     *
     * @remarks If a player joins your world instance after an object's visibility is
     * changed with the resetVisibilityForPlayers method, the object becomes
     * invisible to the new player. To ensure all new players can see the object upon
     * joining the world instance, you must use the resetVisibilityForPlayers method.
     * If a parent entity has its visibility set to false, the child entity also becomes
     * invisible regardless of its own visibility setting.
     *
     * @example
     * cubeEntity.resetPlayerVisibilityList();
     */
    resetVisibilityForPlayers(): void;
    /**
     * Indicates whether the entity is visible to the player.
     *
     * @param player - The player to check the view permission for.
     *
     * @returns `true` if the player has permission to view the entity, `false` otherwise.
     *
     * @remarks
     * The return value isn't affected by the `visible` property. For a player to
     * view an entity, the entity must be visible (the `visible` property on the
     * entity is `true`), and the user must have permission to view the entity
     * (this function returns `true`).
     *
     * @example
     * ```
     * const playerHasViewPermission: boolean = cubeEntity.isVisibleTo(player);
     * const isTrulyVisible: boolean = playerHasViewPermission && cubeEntity.visible.get();
     * ```
     */
    isVisibleToPlayer(player: Player): boolean;
    /**
     * Rotates an entity to look at a point.
     *
     * @param target - The target for the entity to look at.
     * @param up - The up direction of the rotation. The default value is
     * {@link Vec3.up}.
     */
    lookAt(target: Vec3, up?: Vec3): void;
    /**
     * Moves every client instance of the entity relative to another entity.
     *
     * @param target - The entity to move towards.
     * @param relativePosition - The position for the client entity to move,
     * relative to the target entity.
     * @param space - Indicates whether relativePosition is a world or local
     * position.
     *
     * @remarks
     * We recommend that you use this operation in an update loop instead of in a
     * one-off call. Make sure that the client or server owns both the source and
     * target, as the operation might not work properly if they are owned by
     * different clients or servers.
     *
     */
    moveRelativeTo(target: Entity, relativePosition: Vec3, space?: Space): void;
    /**
     * Moves every client instance of the entity relative to a player.
     *
     * @param player - The entity to move towards.
     * @param bodyPart - The body part of the player.
     * @param relativePosition - The position for the client entity to move,
     * relative to the target entity.
     * @param space - Indicates whether the relativePosition is a world or a local
     * position.
     *
     * @remarks
     * We recommend that you use this operation in an update loop instead of in a
     * one-off call. Make sure that the client or server owns both the source and
     * target, as the operation might not work properly if they are owned by
     * different clients or servers.
     */
    moveRelativeToPlayer(player: Player, bodyPart: PlayerBodyPartType, relativePosition: Vec3, space?: Space): void;
    /**
     * Rotates every client instance of the entity relative to another entity.
     *
     * @param target - The entity to rotate around.
     * @param relativeRotation - The rotation relative to the target.
     * @param space - Indicates whether relativeRotation is a world or a local
     * rotation.
     *
     * @remarks
     * We recommend that you use this operation in an update loop instead of in a
     * one-off call. Make sure that the client or server owns both the source and
     * target, as the operation might not work properly if they are owned by
     * different clients or servers.
     */
    rotateRelativeTo(target: Entity, relativeRotation: Quaternion, space?: Space): void;
    /**
     * Rotates every client instance of the entity relative to a player.
     *
     * @param player - The player for the entity to rotate around.
     * @param bodyPart - The body part of the player.
     * @param relativeRotation - The rotation relative to the player.
     * @param space - Indicates whether the relativeRotation is a world or a local
     * rotation.
     *
     * @remarks
     * We recommend that you use this operation in an update loop instead of in a
     * one-off call. Make sure that the client or server owns both the source and
     * target, as the operation might not work properly if they are owned by
     * different clients or servers.
     */
    rotateRelativeToPlayer(player: Player, bodyPart: PlayerBodyPartType, relativeRotation: Quaternion, space?: Space): void;
    /**
     * Get an axis aligned bounding box that surrounds the renderers in this entity and its children
     * in world space
     * @returns a Bounds object encompassing all renderers under an entity
     */
    getRenderBounds(): Bounds;
    /**
     * Get an axis aligned bounding box that surrounds the colliders in this entity and its children
     * in world space
     * @returns a Bounds object encompassing all colliders under an entity
     */
    getPhysicsBounds(): Bounds;
}
/**
 * Represents a spawn point in the world.
 */
export declare class SpawnPointGizmo extends Entity {
    /**
     * Creates a human-readable representation of the entity.
     * @returns A string representation
     */
    toString(): string;
    /**
     * Teleports a player to the spawn point.
     * @param player - The player to teleport
     */
    teleportPlayer(player: Player): void;
}
/**
 * Represents a text label in the world.
 */
export declare class TextGizmo extends Entity {
    /**
     * Creates a human-readable representation of the entity.
     * @returns A string representation
     */
    toString(): string;
    /**
     * The content to display in the text label.
     */
    text: HorizonProperty<string>;
}
/**
 * Represents a Trigger in the world.
 */
export declare class TriggerGizmo extends Entity {
    /**
     * Creates a human-readable representation of the entity.
     * @returns A string representation
     */
    toString(): string;
    /**
     * Whether the Trigger is enabled.
     */
    enabled: WritableHorizonProperty<boolean>;
}
/**
 * Specifies how the particle effect starts playing.
 * @param fromStart - If true, the effect plays from the beginning even if already playing.
 * Otherwise, playing the effect is a no-op if already playing.
 * @param players - The array of players to apply this change to.
 * @param oneShot - If true, the effect emits a new particle which will play until end
 * of life. Does not interfere with other play interactions.
 */
export declare type ParticleFXPlayOptions = {
    fromStart?: boolean;
    players?: Array<Player>;
    oneShot?: boolean;
};
/**
 * Specifies how the particle effect stops playing.
 * @param players - The array of players to apply this change to.
 */
export declare type ParticleFXStopOptions = {
    players?: Array<Player>;
};
/**
 * Represents a particle effect in the world.
 */
export declare class ParticleGizmo extends Entity {
    /**
     * Creates a human-readable representation of the entity.
     * @returns A string representation
     */
    toString(): string;
    /**
     * Plays the particle effect.
     *
     * @param options - Optional. Controls how the effect is played.
     */
    play(options?: ParticleFXPlayOptions): void;
    /**
     * Stops the particle effect
     * @param options - Optional. Controls how the effect is stopped.
     *
     * `players` - The array of players to apply this change to.
     */
    stop(options?: ParticleFXStopOptions): void;
}
/**
 * Represents a trail in the world.
 */
export declare class TrailGizmo extends Entity {
    /**
     * Creates a human-readable representation of the entity.
     * @returns A string representation
     */
    toString(): string;
    /**
     * Plays the trail effect
     */
    play(): void;
    /**
     * Stops the trail effect
     */
    stop(): void;
    /**
     * The width of the trail, in meters.
     */
    width: HorizonProperty<number>;
    /**
     * The length of the trail, in meters.
     */
    length: HorizonProperty<number>;
}
/**
 * Determines whether sound from an {@link AudioGizmo} is audible to specific
 * players.
 */
export declare enum AudibilityMode {
    /**
     * The sound is audible.
     */
    AudibleTo = 0,
    /**
     * The sound is inaudible.
     */
    InaudibleTo = 1
}
/**
 * Provides {@link AudioGizmo} playback options for a set of players.
 *
 * @remarks
 * fade - The duration, in seconds, that it takes for the audio to fade in or fade out.
 *
 * players - Only plays the audio for the specified players.
 *
 * audibilityMode - Indicates whether the audio is audible to the specified players.
 * See {@link AudibilityMode} for more information.
 */
export declare type AudioOptions = {
    fade: number;
    players?: Array<Player>;
    audibilityMode?: AudibilityMode;
};
/**
 * Represents an audio gizmo in the world.
 */
export declare class AudioGizmo extends Entity {
    /**
     * Creates a human-readable representation of the audio gizmo.
     *
     * @returns A string representation of the audio gizmo.
     */
    toString(): string;
    /**
     * The audio volume, which ranges from 0 (no sound) to 1 (full volume).
     */
    volume: WritableHorizonProperty<number, AudioOptions>;
    /**
     * The audio pitch in semitones, which ranges from -12 to 12.
     */
    pitch: WritableHorizonProperty<number>;
    /**
     * Plays an AudioGizmo sound.
     *
     * @param audioOptions - Controls how the audio is played.
     *
     * @example
     * ```
     * const soundGizmo = this.props.sfx.as(hz.AudioGizmo);
     * const audioOptions: AudioOptions = {fade: 1, players: [player1, player2]};
     * soundGizmo.play(audioOptions);
     * ```
     */
    play(audioOptions?: AudioOptions): void;
    /**
     * Pauses an AudioGizmo sound.
     *
     * @param audioOptions - Controls how the audio is paused.
     *
     * @example
     * ```
     * const soundGizmo = this.props.sfx.as(hz.AudioGizmo);
     * const audioOptions: AudioOptions = {fade: 1, players: [player1, player2]};
     * soundGizmo.pause(audioOptions);
     * ```
     */
    pause(audioOptions?: AudioOptions): void;
    /**
     * Stops an AudioGizmo sound.
     *
     * @param audioOptions - Controls how the audio is played.
     *
     * @example
     * ```
     * const soundGizmo = this.props.sfx.as(hz.AudioGizmo);
     * const audioOptions: AudioOptions = {fade: 1, players: [player1, player2]};
     * soundGizmo.stop(audioOptions);
     * ```
     */
    stop(audioOptions?: AudioOptions): void;
}
/**
 * Represents a projectile launcher in the world.
 */
export declare class ProjectileLauncherGizmo extends Entity {
    /**
     * Creates a human-readable representation of the entity.
     * @returns A string representation
     */
    toString(): string;
    /**
     * The gravity applied to the projectile.
     */
    projectileGravity: WritableHorizonProperty<number>;
    /**
     * Launches a projectile.
     *
     * @param speed - Optional. The speed at which the projectile will launch from the launcher.
     */
    launchProjectile(speed?: number): void;
}
/**
 * Represents an achievement gizmo in the world.
 */
export declare class AchievementsGizmo extends Entity {
    /**
     * Creates a human-readable representation of the entity.
     * @returns A string representation
     */
    toString(): string;
    /**
     * Displays the achievements.
     *
     * @param achievementScriptIDs - List of achievement script IDs.
     */
    displayAchievements(achievementScriptIDs: Array<string>): void;
}
/**
 * Represents the time for monetary gizmo in the world.
 */
export declare enum MonetizationTimeOption {
    /**
     * The time is displayed in seconds.
     */
    Seconds = "SECONDS",
    /**
     * The time is displayed in hours.
     */
    Hours = "HOURS",
    /**
     * The time is displayed in days.
     */
    Days = "DAYS"
}
/**
 * Represents the IWP seller gizmo in the world.
 */
export declare class IWPSellerGizmo extends Entity {
    /**
     * Creates a human-readable representation of the entity.
     * @returns A string representation
     */
    toString(): string;
    /**
     * Gets whether the player owns a specific item.
     *
     * @param player - The player who might own the item.
     * @param item - The item that the player might own.
     * @returns `true` if player owns the item, `false` otherwise.
     */
    playerOwnsItem(player: Player, item: string): boolean;
    /**
     * Whether a player has used a specific item.
     *
     * @param player - The player who might have used the item.
     * @param item - The item the player might have consumed.
     * @returns `true` if player has consumed the item, `false` otherwise.
     */
    playerHasConsumedItem(player: Player, item: string): boolean;
    /**
     * Gets the number of the items that the player owns.
     *
     * @param player - The player who might own the items.
     * @param item - The item that the player might own.
     * @returns the number of the items that the player has.
     */
    quantityPlayerOwns(player: Player, item: string): number;
    /**
     * Gets the time since player consumed the item.
     *
     * @param player - the player who consumed the item.
     * @param item - the item that the player consumed
     * @param timeOption - the time units since the player purchased and the item was consumed.
     * @returns the number of `timeOption` units since player consumed the item.
     */
    timeSincePlayerConsumedItem(player: Player, item: string, timeOption: MonetizationTimeOption): number;
    /**
     * Consumes a player's item.
     *
     * @param player - The player who owns the item.
     * @param item - The item the player owns.
     */
    consumeItemForPlayer(player: Player, item: string): void;
}
/**
 * Represents a type of layer in the world.
 */
export declare enum LayerType {
    /**
     * The layer for players.
     */
    Player = 0,
    /**
     * The layer is for objects.
     */
    Objects = 1,
    /**
     * The layer is for both players and objects.
     */
    Both = 2
}
/**
 * The type of target a raycast has hit
 */
export declare enum RaycastTargetType {
    Player = 0,
    Entity = 1,
    Static = 2
}
/**
 * The base class for the result of a {@link RaycastGizmo.raycast | raycast} collision.
 */
export declare type BaseRaycastHit = {
    /**
     * The distance between the raycast position and the hit point.
     */
    distance: number;
    /**
     * The position of the raycast hit.
     */
    hitPoint: Vec3;
    /**
     * The normal of the raycast hit.
     */
    normal: Vec3;
};
/**
 * The result of a {@link RaycastGizmo.raycast | raycast} collision against a static {@link Entity | Entity}.
 */
export declare type StaticRaycastHit = BaseRaycastHit & {
    /**
     * The type of target a raycast has hit
     */
    targetType: RaycastTargetType.Static;
};
/**
 * The result of a {@link RaycastGizmo.raycast | raycast} collision against an {@link Entity | Entity}.
 */
export declare type EntityRaycastHit = BaseRaycastHit & {
    /**
     * The type of target a raycast has hit
     */
    targetType: RaycastTargetType.Entity;
    /**
     * The actual entity in the world the raycast has hit.
     */
    target: Entity;
};
/**
 * The result of a {@link RaycastGizmo.raycast | raycast} collision against a {@link Player | Player}.
 */
export declare type PlayerRaycastHit = BaseRaycastHit & {
    /**
     * The type of target a raycast has hit
     */
    targetType: RaycastTargetType.Player;
    /**
     * The actual player in the world the raycast has hit.
     */
    target: Player;
};
/**
 * The result of a raycast hit
 */
export declare type RaycastHit = StaticRaycastHit | EntityRaycastHit | PlayerRaycastHit;
/**
 * `layerType` - `Player`, `Objects`, or `Both`
 *
 * `maxDistance` - the maximum distance to send the raycast from the origin, from 0 (the origin) to 100 (farthest from the origin)
 *
 * `stopOnFirstHit` -
 * if true, the raycast will stop on the first collision it meets, but will return a StaticHit if layer and tag don't match
 * if false, the raycast will only find players/entities matching with the layer type and tag
 * Note: tags are defined in the Gizmo, no tag means hit anything
 */
export declare type RaycastOptions = {
    layerType?: LayerType;
    maxDistance?: number;
    stopOnFirstHit?: boolean;
};
/**
 * Represents a raycast gizmo in the world.
 */
export declare class RaycastGizmo extends Entity {
    /**
     * Creates a human-readable representation of the object.
     * @returns A string representation of the object
     */
    toString(): string;
    /**
     * Raycast from a raycast gizmo
     * @param origin - from where to start the raycast
     * @param direction - the direction in which to send the raycast
     * @param options - options to configure raycast
     *
     * @returns information about the raycast hit
     */
    raycast(origin: Vec3, direction: Vec3, options?: RaycastOptions): RaycastHit | null;
}
/**
 * Represents a dynamic lighting gizmo in the world.
 */
export declare class DynamicLightGizmo extends Entity {
    /**
     * Creates a human-readable representation of the object.
     * @returns A string representation of the object
     */
    toString(): string;
    /**
     * Whether the entity has a dynamic light effect on it.
     * Use `set(true)` to enable dynamic lighting; `set(false)` to disable dynamic lighting.
     */
    enabled: HorizonProperty<boolean>;
    /**
     * The light intensity.
     * Use `set(0)` for least intense; `set(10)` for most intense.
     */
    intensity: HorizonProperty<number>;
    /**
     * The light falloff distance.
     * Use `set(0)` for the least distance; `set(100)` for the greatest distance.
     */
    falloffDistance: HorizonProperty<number>;
    /**
     * The light spread.
     * Use `set(0)` for the least light spread (none); to `set(100)` for the greatest light spread.
     */
    spread: HorizonProperty<number>;
}
/**
 * Represents how physics is applied to an object in the world.
 */
export declare enum PhysicsForceMode {
    /**
     * Add a continuous force to an object, using its mass.
     */
    Force = 0,
    /**
     * Add an instant force impulse to an object, using its mass.
     */
    Impulse = 1,
    /**
     * Add an instant velocity change to an object, ignoring its mass.
     */
    VelocityChange = 2
}
/**
 * Defines the springs physics
 * `stiffness` - The stiffness of the spring, which controls the amount of force applied on the object.
 *
 * `damping` - The damping ratio of the string, which reduces oscillation.
 *
 * `axisIndependent` - Whether the object's motion is parallel to the push direction.
 */
export declare type SpringOptions = {
    stiffness: number;
    damping: number;
    axisIndependent: boolean;
};
/**
 * Defines the default parameters used for springs.
 * `stiffness` = 2
 *
 * `damping` = 0.5
 *
 * `axisIndependent` = true
 */
export declare const DefaultSpringOptions: SpringOptions;
/**
 * Represents an entity influenced by physical effects such as gravity, in the world.
 */
export declare class PhysicalEntity extends Entity {
    /**
     * Gets a string representation of the entity.
     * @returns The human readable string representation of this entity.
     */
    toString(): string;
    /**
     * Whether the entity has a gravity effect on it.
     * If `true`, gravity has an effect, otherwise gravity does not have an effect.
     */
    gravityEnabled: WritableHorizonProperty<boolean>;
    /**
     * Whether Physics system is blocked from interacting with the entity.
     */
    locked: HorizonProperty<boolean>;
    /**
     * The velocity of an object in world space, in meters per second.
     */
    velocity: ReadableHorizonProperty<Vec3>;
    /**
     * The angular velocity of an object in world space.
     */
    angularVelocity: ReadableHorizonProperty<Vec3>;
    /**
     * Applies a force at a world space point. Adds to the current velocity.
     * @param vector - The force vector.
     * @param mode - The amount of force to apply, either impulse or velocity change.
     * For `Impulse`, acceleration = Force * Time / Mass.
     * For `VelocityChange`, acceleration = Force * Time.
     */
    applyForce(vector: Vec3, mode: PhysicsForceMode): void;
    /**
     * Applies a local force at a world space point. Adds to the current velocity.
     * @param vector - The force vector.
     * @param mode - The amount of force to apply, either impulse or velocity change.
     * For `ImpLocal`, acceleration = Force * Time / Mass.
     * For `VelocityChange`, acceleration = Force * Time.
     */
    applyLocalForce(vector: Vec3, mode: PhysicsForceMode): void;
    /**
     * Applies a force at a world space point using a specified position as the center of force.
     * @param vector - The force vector.
     * @param position - The position of the center of the force vector.
     * @param mode - The amount of force to apply, either impulse or velocity change.
     * For `Force`, acceleration = Force * Time ^ 2 / Mass.
     */
    applyForceAtPosition(vector: Vec3, position: Vec3, mode: PhysicsForceMode): void;
    /**
     * Applies torque to the entity.
     * @param vector - The force vector.
     */
    applyTorque(vector: Vec3): void;
    /**
     * Applies a local torque to the entity.
     * @param vector - The force vector.
     */
    applyLocalTorque(vector: Vec3): void;
    /**
     * Sets the velocity of an entity to zero.
     */
    zeroVelocity(): void;
    /**
     * Pushes a physical entity toward a target position as if it's attached to a spring.
     * This should be called every frame and requires the physical entity's motion type to be interactive.
     *
     * @param position - The target position, or 'origin' of the spring
     * @param options - Additional optional arguments to control the spring's behavior.
     *
     * `stiffness` - Controls the amount of force applied on the object.
     *
     * `damping` - The damping ratio of the string, which reduces oscillations.
     *
     * `axisIndependent` - Ensures that the object's motion is parallel to the push direction.
     *
     * @example
     * ```
     * var physEnt = this.props.obj1.as(hz.PhysicalEntity);
     * this.connectLocalBroadcastEvent(hz.World.onUpdate, (data: { deltaTime: number }) => {
     *  physEnt.springPushTowardPosition(this.props.obj2.position.get(), {stiffness: 5, damping: 0.2});
     * })
     * ```
     */
    springPushTowardPosition(position: Vec3, options?: Partial<SpringOptions>): void;
    /**
     * Spins a physical entity toward a target rotation as if it's attached to a spring.
     * This should be called every frame and requires the physical entity's motion type to be interactive.
     *
     * @param rotation - The target quaternion rotation.
     * @param options - Additional optional arguments to control the spring's behavior.
     *
     * `stiffness` - Controls the amount of force applied on the object.
     * `damping` - The damping ratio of the string, which reduces oscillations.
     * `axisIndependent` - Ensures that the object's spinning motion is parallel to the push direction.
     *
     * @example
     * ```
     * var physEnt = this.props.obj1.as(hz.PhysicalEntity);
     * this.connectLocalBroadcastEvent(hz.World.onUpdate, (data: { deltaTime: number }) => {
     *  physEnt.springSpinTowardRotation(this.props.obj2.rotation.get(), {stiffness: 10, damping: 0.5, axisIndependent: false});
     * })
     * ```
     */
    springSpinTowardRotation(rotation: Quaternion, options?: Partial<SpringOptions>): void;
}
/**
 * Represents an entity that the user can grab.
 */
export declare class GrabbableEntity extends Entity {
    /**
     * Creates a human-readable representation of the object.
     * @returns A string representation of the object
     */
    toString(): string;
    /**
     * Forces the player to hold the entity and attach it to a hand they control.
     * @param player - the player who is grabbing the entity.
     * @param hand - the player's hand that is grabbing the entity.
     * @param allowRelease - whether the player can release the entity when they are holding it.
     */
    forceHold(player: Player, hand: Handedness, allowRelease: boolean): void;
    /**
     * Forces the player to release the entity.
     */
    forceRelease(): void;
    /**
     * Specify who can grab the entity.
     * @param players - an array of players who can grab the entity.
     */
    setWhoCanGrab(players: Array<Player>): void;
}
/**
 * Represents the attachment point on the player.
 */
export declare enum AttachablePlayerAnchor {
    /**
     * The attachment is at the head.
     */
    Head = "Head",
    /**
     * The attachment is at the torso.
     */
    Torso = "Torso"
}
/**
 * Represents an entity that can be attached to other entities.
 */
export declare class AttachableEntity extends Entity {
    /**
     * Creates a human-readable representation of the object.
     * @returns A string representation of the object
     */
    toString(): string;
    /**
     * Attaches the entity to a player.
     * @param player - the player who is attaching to the entity.
     * @param anchor - the attachment point.
     */
    attachToPlayer(player: Player, anchor: AttachablePlayerAnchor): void;
    /**
     * Releases an attachment to a player.
     */
    detach(): void;
    /**
     * The socket attachment position offset applied to the `AttachableEntity` when using Anchor attachment mode.
     */
    socketAttachmentPosition: HorizonProperty<Vec3>;
    /**
     * The socket attachment rotation offset applied to the `AttachableEntity` when using Anchor attachment mode.
     */
    socketAttachmentRotation: HorizonProperty<Quaternion>;
}
/**
 * Represents an entity that that can be animated by a transform.
 */
export declare class AnimatedEntity extends Entity {
    /**
     * Creates a human-readable representation of the object.
     * @returns A string representation of the object
     */
    toString(): string;
    /**
     * Starts the animation for this entity.
     */
    play(): void;
    /**
     * Pause the animation.
     */
    pause(): void;
    /**
     * Stop the animation.
     */
    stop(): void;
}
/**
 * Represents a body part of a player. These are used to describe the parts of the player.
 */
export declare enum PlayerBodyPartType {
    /**
     * The body part is a head.
     */
    Head = 0,
    /**
     * The body part is a foot.
     */
    Foot = 1,
    /**
     * The body part is a torso.
     */
    Torso = 2,
    /**
     * The body part is a left hand.
     */
    LeftHand = 3,
    /**
     * The body part is a right hand.
     */
    RightHand = 4
}
/**
 * Represents whether a player is left or right-handed.
 */
export declare enum Handedness {
    /**
     * The player is left-handed.
     */
    Left = 0,
    /**
     * The player is right-handed.
     */
    Right = 1
}
/**
 * Represents the strength of a haptic pulse.
 */
export declare enum HapticStrength {
    /**
     * The player is not touching the controller, so no haptic pulse will be fired.
     */
    VeryLight = 0,
    /**
     * The player is touching the controller and should fire a light haptic.
     */
    Light = 1,
    /**
     * The player is touching the controller and should fire a medium haptic.
     */
    Medium = 2,
    /**
     * The player is touching the controller and should fire a strong haptic.
     */
    Strong = 3
}
/**
 * Represents the sharpness of the haptic pulse.
 */
export declare enum HapticSharpness {
    /**
     * The pulse is sharp.
     */
    Sharp = 0,
    /**
     * The pulse is medium.
     */
    Coarse = 1,
    /**
     * The pulse is soft.
     */
    Soft = 2
}
/**
 * Represents the interaction mode of an entity
 */
export declare enum EntityInteractionMode {
    /**
     * The entity can be grabbed.
     */
    Grabbable = "Grabbable",
    /**
     * The entity supports physics and can be moved by script.
     */
    Physics = "Physics",
    /**
     * The entity can be grabbed and supports physics.
     */
    Both = "Both",
    /**
     * The entity cannot be grabbed, and does not support physics.
     * @privateRemarks
     * Or is there a different description? Any error thrown?
     */
    Invalid = "Invalid"
}
/**
 * Represents a player body part.
 */
export declare class PlayerBodyPart {
    protected readonly player: Player;
    protected readonly type: PlayerBodyPartType;
    /**
     * Creates a `PlayerBodyPart`.
     * @param player - The player associated with this body part.
     * @param type - The type of the body part.
     */
    constructor(player: Player, type: PlayerBodyPartType);
    /**
     * The position of the body part relative to the player.
     */
    position: ReadableHorizonProperty<Vec3>;
    /**
     * The position of the body part relative to the player's torso.
     */
    localPosition: ReadableHorizonProperty<Vec3>;
    /**
     * The rotation of the body part relative to the player's body.
     */
    rotation: ReadableHorizonProperty<Quaternion>;
    /**
     * The local rotation of the body part relative to the player's torso.
     */
    localRotation: ReadableHorizonProperty<Quaternion>;
    /**
     * The forward direction of the body part.
     */
    forward: ReadableHorizonProperty<Vec3>;
    /**
     * The up direction of the body part.
     */
    up: ReadableHorizonProperty<Vec3>;
    /**
     * Alias for position and localPosition property getters.
     * @param space - whether to get world or local position
     * @returns the position of the body part in this space.
     */
    getPosition(space: Space): Vec3;
    /**
     * Alias for rotation and localRotation property getters.
     * @param space - whether to get world or local rotation
     * @returns the rotation of the body part in this space.
     */
    getRotation(space: Space): Quaternion;
}
/**
 * Represents a player's hand.
 */
export declare class PlayerHand extends PlayerBodyPart {
    protected readonly handedness: Handedness;
    /**
     *
     * @param player - The player associated with this hand.
     * @param handedness - The player's handedness, either Left or Right.
     */
    constructor(player: Player, handedness: Handedness);
    /**
     * Plays haptics on the specified hand
     * @param duration - Duration in MS
     * @param strength - Strength of haptics to play
     * @param sharpness - Sharpness of the haptics
     */
    playHaptics(duration: number, strength: HapticStrength, sharpness: HapticSharpness): void;
}
/**
 * Represents the voip settings for the current user.
 */
export declare const VoipSettingValues: {
    /**
     * Users can hear normally.
     */
    readonly Default: "Default";
    /**
     * All users can hear.
     */
    readonly Global: "Global";
    /**
     * Only nearby users can hear.
     */
    readonly Nearby: "Nearby";
    /**
     * Users who are further away than normal can hear.
     */
    readonly Extended: "Extended";
    /**
     * Only users next to you (closer than nearby) can hear.
     */
    readonly Whisper: "Whisper";
    /**
     * No one but you can hear.
     */
    readonly Mute: "Mute";
    /**
     * The world's default voip setting.
     */
    readonly Environment: "Environment";
};
/**
 * The player's in-game voice chat setting.
 */
export declare type VoipSetting = keyof typeof VoipSettingValues;
/**
 * Represents the type of device the player is using.
 */
export declare enum PlayerDeviceType {
    /**
     * The player is using a VR device.
     */
    VR = "VR",
    /**
     * The player is using a mobile device.
     */
    Mobile = "Mobile",
    /**
     * The player is using an desktop device.
     */
    Desktop = "Desktop"
}
/**
 * The pose type defines the HWXS animation set which is assigned to an avatar.
 */
export declare enum AvatarGripPose {
    /**
     * The Default grip type.
     */
    Default = "Default",
    /**
     * Held in a pistol grip.
     */
    Pistol = "Pistol",
    /**
     * Held in a shotgun grip.
     */
    Shotgun = "Shotgun",
    /**
     * Held in a rifle grip.
     */
    Rifle = "Rifle",
    /**
     * Held in an RPG grip.
     */
    RPG = "RPG",
    /**
     * Held in a sword grip.
     */
    Sword = "Sword",
    /**
     * Held in a torch grip.
     */
    Torch = "Torch",
    /**
     * Held in a shield grip.
     */
    Shield = "Shield",
    /**
     * Held in a fishing grip.
     */
    Fishing = "Fishing",
    /**
     * Generic grip for carrying lighter objects
     */
    CarryLight = "CarryLight",
    /**
     * Generic grip for carrying heavier objects
     */
    CarryHeavy = "CarryHeavy",
    /**
     * Generic grip for driving objects.
     */
    Driving = "Driving"
}
/**
 * Defines the currently available avatar grip pose animations.
 */
export declare enum AvatarGripPoseAnimationNames {
    /**
     * Fire animation for the player.
     */
    Fire = "Fire",
    /**
     * Reload animation for the player.
     */
    Reload = "Reload"
}
/**
 * Options that can be specified when enabling aim assist.
 */
export declare type AimAssistOptions = {
    /**
     * The intensity of the pulling force towards the Aim Assist target, in degrees of camera rotation per second.
     * Default value is 10.
     */
    assistanceStrength?: number;
    /**
     * The size of the target used to decide whether the assistance forces apply, in meters. A bigger target will cause the assistance to kick-in when the aiming reticle (center of the screen) is farther away from the center of the target.
     * Default value is 4.
     */
    targetSize?: number;
    /**
     * The duration in seconds after which the aim assistance stops being applied when no input is received. 0 = infinite.
     * Default value is 1.
     */
    noInputGracePeriod?: number;
};
/**
 * Options that can be specified when focusing UI
 */
export declare type FocusUIOptions = {
    /**
     * Defines the duration of the animation of the camera to reach target destination
     */
    duration?: number;
    /**
     * Horizontal offset added to the target destination facing the UI element.
     * In object coordinates.
     * Above 0 = to the right
     * Under 0 = to the left
     */
    horizontalOffset?: number;
    /**
     * Vertical offset added to the target destination facing the UI element.
     * In object coordinates.
     * Above 0 = up
     * Under 0 = down
     */
    verticalOffset?: number;
    /**
     * Rotation applied to the final orientation of the camera facing the UI element.
     * In Euler angles
     */
    rotation?: Vec3;
    /**
     * Distance to the UI element expressed in ratio screen to UI
     */
    fillPercentage?: number;
};
/**
 * Represents a player in the world.
 */
export declare class Player {
    /**
     * The player's ID.
     */
    readonly id: number;
    /**
     * Creates a player in the world.
     * @param id - The ID of the player.
     * @returns The new player.
     */
    constructor(id: number);
    /**
     * Creates a human-readable representation of the player.
     * @returns A string representation of the player.
     */
    toString(): string;
    /**
     * The player's head.
     */
    head: PlayerBodyPart;
    /**
     * The player's torso.
     */
    torso: PlayerBodyPart;
    /**
     * The player's foot.
     */
    foot: PlayerBodyPart;
    /**
     * The player's left hand.
     */
    leftHand: PlayerHand;
    /**
     * The player's right hand.
     */
    rightHand: PlayerHand;
    /**
     * The player's position relative to the world origin.
     */
    position: HorizonProperty<Vec3>;
    /**
     * The player's rotation relative to the world origin.
     */
    rotation: ReadableHorizonProperty<Quaternion>;
    /**
     * The player's forward direction relative to the world origin.
     */
    forward: ReadableHorizonProperty<Vec3>;
    /**
     * The player's up direction relative to the world origin.
     */
    up: ReadableHorizonProperty<Vec3>;
    /**
     * The player's name displayed in the game.
     */
    name: ReadableHorizonProperty<string>;
    /**
     * The index in the list of all players in the world.
     * @remarks
     * When joing a world, each player is assigned an index, which ranges from 0 (the first player)
     * to `Max Players - 1`. Use the index value to keep track of players and get a Player object using
     * {@link world.getPlayerFromIndex}.
     */
    index: ReadableHorizonProperty<number>;
    /**
     * The player's velocity relative to the origin, in meters per second.
     */
    velocity: HorizonProperty<Vec3>;
    /**
     * The player's gravity before simulation.
     */
    gravity: HorizonProperty<number>;
    /**
     * Indicates whether the player is grounded (touching a floor).
     * If a player is grounded then gravity has no effect on their velocity.
     * @returns true if the player is grounded; otherwise, false.
     */
    isGrounded: ReadableHorizonProperty<boolean>;
    /**
     * The speed at which the player moves, in meters per second.
     *
     * @remarks
     *
     * Default value is 4.5.
     * locomotionSpeed must be a value between 0 and 45.
     */
    locomotionSpeed: WritableHorizonProperty<number>;
    /**
     * The speed applied to a player when they jump, in meters per second.
     * Setting this to 0 effectively disables a player's ability to jump.
     *
     * @remarks
     *
     * Default value is 4.3.
     * jumpSpeed must be a value between 0 and 45.
     * `jumpSpeed.set` can be called on any player from any context, but
     * `jumpSpeed.get` will throw an error unless it's called from a
     * local script attached to an object owned by the player in question.
     */
    jumpSpeed: HorizonProperty<number>;
    /**
     * Gets the type of device the player is using.
     *
     * @remarks New device types may be added in the future, so you should handle
     * this property with a switch statement.
     */
    deviceType: ReadableHorizonProperty<PlayerDeviceType>;
    /**
     * Indicates whether a player is in build mode.
     *
     * @remarks Build mode means the player is editing the world. The alternative,
     * preview mode, is when they're playing the world.
     */
    isInBuildMode: ReadableHorizonProperty<boolean>;
    /**
     * Applies a force vector to the player.
     * @param force - The force vector applied to the player's body.
     * @privateRemarks
     * Do we have any units? Ranges? Usage guidelines?
     */
    applyForce(force: Vec3): void;
    /**
     * Specifies whether physical hands can collide with objects.
     * @param collideWithDynamicObjects - Indicates whether physical hands can collide with dynamic objects.
     * @param collideWithStaticObjects - Indicates whether physical hands can collide with static objects.
     */
    configurePhysicalHands(collideWithDynamicObjects: boolean, collideWithStaticObjects: boolean): void;
    /**
     * Sets the VOIP setting for the player.
     * @param setting - The VOIP setting to use.
     */
    setVoipSetting(setting: VoipSetting): void;
    /**
     * Indicates whether a player has completed an achievement.
     * @param achievementScriptID - The scriptID of the achievement. This can be accessed
     * and set on the Achievements page in the VR creator UI.
     * @returns `true` if the player has the achievement, `false` otherwise.
     *
     * @example
     * var WonAGameAchievementScriptID = "wonAGame"
     * var hasAchievement = player.hasCompletedAchievement(WonAGameAchievementScriptID)
     */
    hasCompletedAchievement(achievementScriptID: string): boolean;
    /**
     * Specifies whether the player's achievement is complete.
     * @param achievementScriptID - The scriptID of the achievement. This can be accessed/set on the Achievements page in the VR creator UI.
     * @param complete - `true` sets the achievement to complete; `false` sets the achievement to incomplete.
     *
     * @example
     * ```
     * var WonAGameAchievementScriptID = "wonAGame"
     * player.setAchievementComplete(WonAGameAchievementScriptID, true)
     * ```
     */
    setAchievementComplete(achievementScriptID: string, complete: boolean): void;
    /**
     * Enables Aim Assistance on a target. This generates a force pulling the cursor
     * towards a target when the aim cursor approaches it.
     *
     * @remarks This method must be called on a local player and has no effect on VR
     * players.
     *
     * @param target - The target that receives Aim Assistance.
     * @param options - The options to use when applying Aim Assistance.
     */
    setAimAssistTarget(target: Player | Entity | Vec3, options?: AimAssistOptions): void;
    /**
     * Disables the Aim Assistance by clearing the current target.
     * This method must be called on a local player.
     * This method has no effect on VR players.
     */
    clearAimAssistTarget(): void;
    /**
     * Triggers a one shot {@link AvatarGripPose} animation by name.
     * @param avatarGripPoseAnimationName - The avatar grip pose animation to play.
     *
     * @example
     * ```
     * player.playAvatarGripPoseAnimationByName(AvatarGripPoseAnimationNames.Fire)
     * ```
     */
    playAvatarGripPoseAnimationByName(avatarGripPoseAnimationName: string): void;
    /**
     * Overrides the existing HWXS avatar grip type, which is determined by the currently held grabbable.
     * @param avatarGripPose - The new pose to apply. This persists until cleared or another grip override is set.
     * For information on clearing an override, see {@link clearAvatarGripPoseOverride}.
     */
    setAvatarGripPoseOverride(avatarGripPose: AvatarGripPose): void;
    /**
     * Clears any override on an avatar grip pose, reverting it to the pose of the currently held grabbable.
     * @remarks For information on overriding an avatar grip pose, see {@link setAvatarGripPoseOverride}.
     */
    clearAvatarGripPoseOverride(): void;
    /**
     * Focus the player's camera on the given selectable object.
     * This method only affects desktop and mobile.
     */
    focusUI(selectable: Entity, options?: FocusUIOptions): void;
    /**
     * Removes focus from any in-world UI the player's camera is currently focused on. This
     * method only affects desktop and mobile.
     */
    unfocusUI(): void;
    /**
     * Enables Focused Interaction mode on the player, disabling avatar controls and enabling
     * direct touch/mouse input.
     *
     * @remarks When in this mode, the {@link PlayerControls} events
     * {@link onFocusedInteractionInputStarted}, {@link onFocusedInteractionInputMoved},
     * and {@link onFocusedInteractionInputEnded} are
     * triggered when the player touches (Mobile) or clicks (Desktop) on the screen.
     *
     * This method must be called on a local player and has no effect on VR players.
     */
    enterFocusedInteractionMode(): void;
    /**
     * Disables Focused Interaction mode on the player.
     * @remarks This method must be called on a local player and has no effect
     * on VR players.
     */
    exitFocusedInteractionMode(): void;
    /**
     * The players focused interaction
     */
    focusedInteraction: FocusedInteraction;
}
export declare class FocusedInteraction {
    protected readonly player: Player;
    constructor(player: Player);
    /**
     * Toggle and adapt the properties of the tap visuals used within Focused Interaction
     * @param isEnabled - Whether to enable or disable the Input Feedback Taps.
     * @param tapOptions - Options to customize the tap visuals.
     */
    setTapOptions(isEnabled: boolean, tapOptions?: Partial<FocusedInteractionTapOptions>): void;
    /**
     * Toggle and adapt the properties of the trail visuals used within Focused Interaction
     * @param isEnabled - Whether to enable or disable the Input Feedback Trail.
     * @param trailOptions - Options to customize the trail visuals.
     */
    setTrailOptions(isEnabled: boolean, trailOptions?: Partial<FocusedInteractionTrailOptions>): void;
}
/**
 * Represents the properties of a focused interaction tap.
 * @param duration - The duration of the tap routine in seconds, limited between 0 and 2.
 * @param startScale - The starting scale of the tap visual, limited between 0 and 5.
 * @param endScale - The ending scale of the tap visual, limited between 0 and 5.
 * @param startRotation - The starting rotation of the tap visual.
 * @param endRotation - The ending rotation of the tap visual.
 * @param startColor - The starting color of the tap visual.
 * @param endColor - The ending color of the tap visual.
 * @param startOpacity - The starting opacity of the tap visual.
 * @param endOpacity - The ending opacity of the tap visual.
 */
export declare type FocusedInteractionTapOptions = {
    duration: number;
    startScale: number;
    endScale: number;
    startRotation: number;
    endRotation: number;
    startColor: Color;
    endColor: Color;
    startOpacity: number;
    endOpacity: number;
};
/**
 * Represents the default properties of a focused interaction input feedback tap.
 * duration - 0.5
 * startScale - 0.4
 * endScale - 1
 * startRotation - 0
 * endRotation - 0
 * startColor - Color.white
 * endColor - Color.white
 * startOpacity - 0.4
 * endOpacity - 0
 */
export declare const DefaultFocusedInteractionTapOptions: FocusedInteractionTapOptions;
/**
 * Represents the properties of a focused interaction trail.
 * @param length - The length of the trail, limited between 0 and 5.
 * @param startWidth - The starting width of the trail, limited between 0 and 2.
 * @param endWidth - The end width of the trail, limited between 0 and 2.
 * @param startColor - The starting color of the trail.
 * @param endColor - The end color of the trail.
 * @param startOpacity - The starting opacity of the trail.
 * @param endOpacity - The end opacity of the trail.
 */
export declare type FocusedInteractionTrailOptions = {
    length: number;
    startWidth: number;
    endWidth: number;
    startColor: Color;
    endColor: Color;
    startOpacity: number;
    endOpacity: number;
};
/**
 * Represents the default properties of a focused interaction input feedback trail.
 * length - 0.25
 * startWidth - 1
 * endWidth - 0.1
 * startColor - Color.white
 * endColor - Color.white
 * startOpacity - 0.4
 * endOpacity - 0
 */
export declare const DefaultFocusedInteractionTrailOptions: FocusedInteractionTrailOptions;
/**
 * Represents an asset in Horizon world.
 */
export declare class Asset {
    readonly id: bigint;
    readonly versionId: bigint;
    /**
     * Creates an instance of {@link Asset}.
     * @param id - The ID of the asset.
     * @param versionId - The version of the asset.
     * @returns a new instance of the asset with the specified ID and version.
     */
    constructor(id: bigint, versionId?: bigint);
    /**
     * Creates an instance of {@link Asset} with the given ID.
     * @param assetClass - The class to instantiate for this asset.
     * @returns The new object.
     */
    as<T extends Asset>(assetClass: Class<[bigint, bigint], T>): T;
    /**
     * Creates a human-readable representation of the object.
     * @returns A string representation of the object
     */
    toString(): string;
    /**
     * Specifies data to serialize as JSON.
     *
     * @returns A valid object that can be serialized as JSON.
     */
    toJSON(): {
        id: bigint;
        versionId: bigint;
        _hzType: string;
    };
    /**
     * Retrieves the raw content of the asset, such as a Text Asset.
     * This Asset is uploaded separately to the Asset Library.
     *
     * @remarks Use it to retrieve large amounts of data to populate the world.
     * Not all assets can be parsed as data.
     *
     * @param asset - The {@link Asset} reference.
     *
     * @returns An AssetContentData object that stores the raw content and can
     * return it in various usuable forms.
     */
    fetchAsData(): Promise<AssetContentData>;
}
/**
 * Class used to parse and store the raw content of an asset. Not all assets
 * can be retrieved as raw data. The asset is stored as a string currently. If
 * you are using this as a JSON regularly, we currently recommend that you cache the json.
 * Otherwise you should cache the object itself.
 */
export declare class AssetContentData {
    private readonly assetContentData;
    /**
     * Constructs a new instance of this class.
     * @param assetContentData - The content of the Asset.
     */
    constructor(assetContentData: Array<string>);
    /**
     * Parse the raw contents of the asset and returns it as a JSON object.
     * template T Provides an interface type for the JSON object to return.
     * For example "interface JSONData \{ a: string; b: string; \}". Leave this as empty if you
     * want a generic JSON object.
     *
     * @returns A generic JSON object or a JSON object that uses a specific interface type.
     * returns null if the content doesn't use JSON or the provided generic type.
     */
    asJSON<T = JSON>(): T | null;
    /**
     * Gets the content of the Asset as a string.
     * @returns The raw content of the Asset as a string.
     */
    asText(): string;
}
/**
 * Represents the state of a spawned entity.
 */
export declare enum SpawnState {
    /**
     * The asset data is not yet available.
     */
    NotReady = 0,
    /**
     * The asset data is available, but not loaded.
     */
    Unloaded = 1,
    /**
     * The asset data is being loaded.
     */
    Loading = 2,
    /**
     * The asset spawn operition is paused.
     */
    Paused = 3,
    /**
     * The load is complete and ready to be enabled,
     * but does not yet count towards capacity.
     */
    Loaded = 4,
    /**
     * The spawn is complete and the asset and ready for use.
     */
    Active = 5,
    /**
     * The spawned asset is in the process of unloading.
     */
    Unloading = 6
}
/**
 * Represents errors encounted during spawning the asset.
 */
export declare enum SpawnError {
    /**
     * No error since the last attempt to spawn.
     */
    None = 0,
    /**
     * The spawn failed due to capacity limitations.
     */
    ExceedsCapacity = 1,
    /**
     * The spawn was cancelled by the user.
     */
    Cancelled = 2,
    /**
     * The specified asset ID was invalid
     * or that type of asset cannot be spawned.
     */
    InvalidAsset = 3,
    /**
     * The asset contains content which is not
     * approved for spawning in this world.
     */
    UnauthorizedContent = 4,
    /**
     * One of more of the request parameters is not valid.
     */
    InvalidParams = 5,
    /**
     * An unexpected error.
     */
    Unknown = 6
}
/**
 * Represents the base class for a controller used to spawn assets.
 */
export declare class SpawnControllerBase {
    /**
     * The ID of the asset that is currently being spawned.
     */
    protected _spawnId: number;
    get spawnId(): number;
    /**
     * Gets list of entities contained in spawned asset.
     */
    readonly rootEntities: ReadableHorizonProperty<Entity[]>;
    /**
     * Gets the current Spawn State of the Spawn Controller asset.
     */
    readonly currentState: ReadableHorizonProperty<SpawnState>;
    /**
     * Gets the Spawn State the Spawn Controller asset is attempting to reach.
     */
    readonly targetState: ReadableHorizonProperty<SpawnState>;
    /**
     * Gets the error associated with the spawn operation.
     */
    readonly spawnError: ReadableHorizonProperty<SpawnError>;
    /**
     * Loads asset data if not previously loaded and then spawns asset.
     */
    spawn(): Promise<void>;
    /**
     * Preloads Spawn Controller asset data.
     */
    load(): Promise<void>;
    /**
     * Pauses Spawn Controller asset spawning process.
     */
    pause(): Promise<void>;
    /**
     * Unloads Spawn Controller asset data.
     */
    unload(): Promise<void>;
}
/**
 * Represents a controller used to spawn assets.
 */
export declare class SpawnController extends SpawnControllerBase {
    /**
     * The asset that is currently being spawned.
     */
    readonly asset: Asset;
    /**
     * Creates controller for spawning an asset.
     *
     * @param asset - The asset to spawn.
     * @param position - The position of the asset in the world.
     * @param rotation - The rotation of the asset in the world.
     * @param scale - The scale of the asset in the world.
     */
    constructor(asset: Asset, position: Vec3, rotation: Quaternion, scale: Vec3);
}
declare enum WorldUpdateType {
    Update = 0,
    PrePhysicsUpdate = 1
}
/**
 * Controls how a popup message is displayed.
 *
 * `position` - Controls the offset of the popup message relative to the player's local position.
 *
 * `fontSize` Controls the size of the font used to display the popup message.
 *
 * `fontColor` Controls the color of the font used to display the popup message.
 *
 * `backgroundColor` Controls the background color of the popup message.
 *
 * `playSound` Whether to play the standard popup sound when the popup is shown.
 *
 * `showTimer` Whether to display the timer when showing the popup.
 */
export declare type PopupOptions = {
    position: Vec3;
    fontSize: number;
    fontColor: Color;
    backgroundColor: Color;
    playSound: boolean;
    showTimer: boolean;
};
/**
 * The default options for showing a popup.
 *
 * `position`: new Vec3(0, -0.5, 0)
 *
 * `fontSize`: 5
 *
 * `fontColor`: Color.black
 *
 * `backgroundColor`: Color.white
 *
 * `playSound`: true
 *
 * `showTimer`: false
 */
export declare const DefaultPopupOptions: PopupOptions;
/**
 * Represents where the tooltip is anchored.
 */
export declare enum TooltipAnchorLocation {
    /**
     * The tooltip is anchored at the left wrist.
     */
    LEFT_WRIST = "LEFT_WRIST",
    /**
     * The tooltip is anchored at the right wrist.
     */
    RIGHT_WRIST = "RIGHT_WRIST",
    /**
     * The tooltip is anchored at the torso.
     */
    TORSO = "TORSO"
}
/**
 * TooltipOptions control how a tooltip message is displayed.
 *
 * `tooltipAnchorOffset` - the offset of the tooltip relative to the anchor location
 *
 * `displayTooltipLine` - whether a line should connect the tooltip to its attachment point
 *
 * `tooltipLineAttachmentProperties` - controls the attachment point and offsets of the line that connects to the tooltip.
 *
 * `playSound` - Whether to display the timer when showing the popup.
 */
export declare type TooltipOptions = {
    tooltipAnchorOffset?: Vec3;
    displayTooltipLine?: boolean;
    tooltipLineAttachmentProperties?: TooltipLineAttachmentProperties;
    playSound?: boolean;
};
/**
 * TooltipLineAttachmentProperties control how the line attached to the tooltip is displayed.
 *
 * lineAttachmentEntity - Controls the entity to which the line attaches (defaults to the anchor attachment point).
 * You can also set it to a PlayerBodyPartType.
 *
 * `lineAttachmentLocalOffset` - Adds a local Vec3 offset on the attachment point for the line.
 *
 * `lineAttachmentRounded` - Whether to round off the start and end edges of the line.
 *
 * `lineChokeStart` - The distance after the attachment point where line should start rendering.
 *
 * `lineChokeEnd` - The distance before the line hits the tooltip where it should stop rendering.
 */
export declare type TooltipLineAttachmentProperties = {
    lineAttachmentEntity?: Entity | PlayerBodyPartType;
    lineAttachmentLocalOffset?: Vec3;
    lineAttachmentRounded?: boolean;
    lineChokeStart?: number;
    lineChokeEnd?: number;
};
/**
 * DefaultTooltipOptions are the default options for showing a popup.
 *
 * `tooltipAnchorOffset` - The default x, y, z offsets, (0, 0.4f, 0).
 *
 * `displayTooltipLine` - if `true`, shows the tooltip line.
 *
 * `playSound` - if `true`, plays a sound.
 */
export declare const DefaultTooltipOptions: TooltipOptions;
/**
 * Defines the valid matching operations that are available when using {@link World.getEntitiesWithTags | getEntitiesWithTags()}
 * to find world entities.
 */
export declare enum EntityTagMatchOperation {
    /**
     * A single match encountered in an {@link Entity.tags | Entity's tags} results in that entity being included in the result. The match must be exact.
     */
    HasAnyExact = 0,
    /**
     * All of the sought tags must be present in an {@link Entity.tags | Entity's tags} for that entity to be included in the result. The match must be exact.
     */
    HasAllExact = 1
}
declare type PersistentSerializableStateNode = Vec3 | Entity | Quaternion | Color | number | boolean | string | bigint | null;
declare type TransientSerializableStateNode = Player;
/**
 * State that can be persisted across sessions within persistent variables
 * for each player. Used with the `getPlayerVariable` and `setPlayerVariable`
 * methods.
 */
export declare type PersistentSerializableState = {
    [key: string]: PersistentSerializableState;
} | PersistentSerializableState[] | PersistentSerializableStateNode;
/**
 * The state transferred to the new owner on ownership change.
 * Implements the `receiveOwnership` and `transferOwnership` methods.
 *
 * @privateRemarks
 * Be very, very careful if you are considering exposing the actual JSON
 * serialized state of this kind of object to the creator. The moment you
 * do so, some creator will begin using it and depending on its internal
 * implementation details, forever locking you in to support that specific
 * format of serializing this data.
 */
export declare type SerializableState = {
    [key: string]: SerializableState;
} | SerializableState[] | PersistentSerializableStateNode | TransientSerializableStateNode;
/**
 * Represents a world.
 */
export declare class World {
    private _localPlayer?;
    /**
     * The event broadcast on every frame.
     * @param deltaTime - The duration, in seconds, since the last update.
     */
    static readonly onUpdate: LocalEvent<{
        deltaTime: number;
    }>;
    /**
     * The event broadcast on every frame before physics.
     * @param deltaTime - The duration, in seconds, since the last update.
     */
    static readonly onPrePhysicsUpdate: LocalEvent<{
        deltaTime: number;
    }>;
    /**
     * Creates a human-readable representation of the object.
     * @returns A string representation of the object
     */
    toString(): string;
    /**
     * Resets the world's state.
     * This sets all entities back to their initial position, cancels all event and event listeners, and restarts scripts in the world.
     */
    reset(): void;
    /**
     * Gets the player corresponding to the server Horizon Worlds client.
     * @remarks This is particularly useful for Local Scripting to figure out if
     * a script is executing on some client other than the server. Note that a
     * server player is not physically present in the world and does not support
     * a number of standard features (such as name.get() or being moved) that normal
     * players do.
     * @returns The server player.
     */
    getServerPlayer(): Player;
    /**
     * Gets the player corresponding to the local Horizon Worlds client running
     * on some player's machine where this script is currently executing.
     * @remarks This is particularly useful for Local Scripting to figure out which
     * player's machine a local script is executing on. Note that if the local script
     * is executing on the server, this will return the server player.
     * @returns The local player.
     */
    getLocalPlayer(): Player;
    /**
     * Gets the player corresponding to the specified player index.
     * @param playerIndex - The index of the player. Retrievable with `player.index.get()`.
     * @returns The player corresponding to that index, or null if no player exists at that index.
     */
    getPlayerFromIndex(playerIndex: number): Player | null;
    /**
     * Gets all players currently in the world, not including the server player.
     * @returns An array of players in the world.
     */
    getPlayers(): Player[];
    /**
     * Searches all world entities containing provided {@link tags | tags}, using {@link matchOperation | the provided match operation}.
     * @remarks This is an expensive operation and should be used carefully.
     * @privateRemarks As is, this is a naive implementation with arbitrary limits. As the API matures we should consider alternative
     * data structures and algorithms for efficient search of entities with given tags.
     * @param tags - An array of tag names to match against. The comparison is case sensitive.
     * @param matchOperation - The {@link EntityTagMatchOperation | match operation} to run when searching for entities with given tags.
     * Defaults to {@link EntityTagMatchOperation.HasAnyExact}.
     * @returns An array of all of the entities matching the tags and operation.
     * @example
     * ```
     * entityA.tags.set(['tag1', 'tag2', 'tag3']);
     * entityB.tags.set(['tag2', 'tag3', 'tag4']);
     * entitiesWithAnytags = this.world.getEntitiesWithTags(['tag1', 'tag2'], EntityTagMatchOperation.MatchAny); // returns entityA & entityB
     * entitiesWithAlltags = this.world.getEntitiesWithTags(['tag3', 'tag4'], EntityTagMatchOperation.MatchAll); // returns entityB
     * ```
     */
    getEntitiesWithTags(tags: string[], matchOperation?: EntityTagMatchOperation): Entity[];
    /**
     * Asynchronously spawns an asset.
     * @param asset - The asset to spawn.
     * @param position - The position where the asset is spawned.
     * @param rotation - The rotation of the spawned asset. If invalid, is replace with `Quaternion.one` (no rotation)
     * @param scale - The scale of the spawned asset.
     * @returns A promise resolving to all of the root entities within the asset.
     */
    spawnAsset(asset: Asset, position: Vec3, rotation?: Quaternion, scale?: Vec3): Promise<Entity[]>;
    /**
     * Removes a previously spawned asset from the world.
     * @param entity - The previously spawned entity.
     * @param fullDelete - if `true`, the entity must be the root object, thus deleting all sub-objects.
     * @returns A promise that resolves when the entity has been deleted.
     */
    deleteAsset(entity: Entity, fullDelete?: boolean): Promise<undefined>;
    /**
     * Called on every frame.
     * @param updateType - The type of update.
     * @param deltaTime - The duration, in seconds, since the last frame.
     */
    update(updateType: WorldUpdateType, deltaTime: number): undefined;
    leaderboards: {
        /**
         * Sets the leaderboard score for a player.
         * @param leaderboardName - The name of the leader board.
         * @param player - The player for whom the score is updated.
         * @param score - The new score.
         * @param override - If `true`, overrides the previous score; otherwise the previous score is retained.
         */
        setScoreForPlayer(leaderboardName: string, player: Player, score: number, override: boolean): void;
    };
    persistentStorage: {
        /**
         * Gets the value of a persistent player variable.
         * @param player - The player for whom to get the value.
         * @param key - The name of the variable to get.
         * @returns The value of the variable as some PersistentSerializableState, defaulting to number
         */
        getPlayerVariable<T extends PersistentSerializableState = number>(player: Player, key: string): T extends number ? T : T | null;
        /**
         * Sets a persistent player variable
         * @param player - The player for whom to set the value.
         * @param key - The name of the variable to set.
         * @param value - The value to assign to the variable.
         */
        setPlayerVariable<T_1 extends PersistentSerializableState>(player: Player, key: string, value: T_1): void;
    };
    ui: {
        /**
         * Shows a popup modal to all players.
         * @param text - The text to display in the popup.
         * @param displayTime - The duration, in seconds, to display the popup.
         * @param options - The configuration, such as color or position, for the popup.
         */
        showPopupForEveryone(text: string, displayTime: number, options?: Partial<PopupOptions>): void;
        /**
         * Shows a popup modal to a player.
         * @param player - The player to whom the popup is to displayed.
         * @param text - The text to display in the popup.
         * @param displayTime - The duration, in seconds, to display the popup.
         * @param options - The configuration, such as color or position, for the popup.
         */
        showPopupForPlayer(player: Player, text: string, displayTime: number, options?: Partial<PopupOptions>): void;
        /**
         * Shows a tooltip modal to a specific player
         * @param player - the player this tooltip displays for
         * @param tooltipAnchorLocation - the anchor point that is used to determine the tooltip display location
         * @param tooltipText - the message the tooltip displays
         * @param options - configuration for the tooltip (display line, play sounds, attachment entity, etc)
         */
        showTooltipForPlayer(player: Player, tooltipAnchorLocation: TooltipAnchorLocation, tooltipText: string, options?: Partial<TooltipOptions>): void;
        /**
         * Dismisses any active tooltip for the target player
         * @param player - the player that has their tooltip dismissed
         * @param playSound - determines if a default "close sound" should play when the tooltip is closed
         */
        dismissTooltip(player: Player, playSound?: boolean): void;
    };
    team: {
        /**
         * Create a new group of teams.
         * Server only, raises an exception on clients.
         *
         * @param name - unique name of the group to create
         * - empty names will be ignored
         * - duplicates will be ignored
         */
        createTeamGroup(name: string): void;
        /**
         * Delete a group of teams.
         * Server only, raises an exception on clients.
         *
         * @param name - name of the group to delete
         * - "Default" or non existing groups are ignored
         */
        deleteTeamGroup(name: string): void;
        /**
         * Create a new team within a group.
         * Server only, raises an exception on clients.
         *
         * @param teamName - unique name of a team
         * - empty names will be ignored
         * - duplicates will be ignored
         * @param teamGroupName - name of the group in which the team will exist
         * - undefined redirects to the "Default" group
         */
        createTeam(teamName: string, teamGroupName?: string): void;
        /**
         * Delete a team within a group.
         * Server only, raises an exception on clients.
         *
         * @param teamName - name of the team to delete
         * - non existing teams are ignored
         * @param teamGroupName - name of the group from which the team will be removed
         * - undefined redirects to the "Default" group
         * - non existing groups are ignored
         */
        deleteTeam(teamName: string, teamGroupName?: string): void;
        /**
         * Adds a player to a team.
         * If the player was already in a team, they a removed from it at the same time.
         * Server only, raises an exception on clients.
         *
         * @param player - Player object to add to the team
         * @param teamName - name of the team to add to
         * - non existing teams are ignored
         * @param teamGroupName - name of the group where the team exists
         * - undefined redirects to the "Default" group
         * - non existing groups are ignored
         */
        addPlayerToTeam(player: Player, teamName: string, teamGroupName?: string): void;
        /**
         * Removes a player from their team.
         * Server only, raises an exception on clients.
         *
         * @param player - Player object to remove from the team
         * @param teamGroupName - name of the group where the team exists
         * - undefined redirects to the "Default" group
         * - non existing groups are ignored
         */
        removePlayerFromTeam(player: Player, teamGroupName?: string): void;
        /**
         * Adds the local player to a team.
         * If the player was already in a team, they a removed from it at the same time.
         * Client only, raises an exception on the server.
         *
         * @param teamName - name of the team to add to
         * - non existing teams are ignored
         * @param teamGroupName - name of the group where the team exists
         * - undefined redirects to the "Default" group
         * - non existing groups are ignored
         */
        addLocalPlayerToTeam(teamName: string, teamGroupName?: string): void;
        /**
         * Removes the local player from their team.
         * Client only, raises an exception on the server.
         *
         * @param teamGroupName - name of the group where the team exists
         * - undefined redirects to the "Default" group
         * - non existing groups are ignored
         */
        removeLocalPlayerFromTeam(teamGroupName?: string): void;
        /**
         * Returns the name of the team a given player is in.
         * If it doesn't exist, returns undefined.
         *
         * @param player - Player to get the team
         * @param teamGroupName - name of the group where the team exists
         * - undefined redirects to the "Default" group
         * - non existing groups are ignored
         * @returns the name of the team or undefined if none
         */
        getPlayerTeam(player: Player, teamGroupName?: string): string | undefined;
        /**
         * Gets the list of all groups currently existing in the world.
         *
         * @returns the list of group names
         */
        getTeamGroupNames(): string[];
        /**
         * Returns the list of all teams withing a group.
         *
         * @param teamGroupName - name of the group where the team exists
         * - undefined redirects to the "Default" group
         * - non existing groups are ignored
         * @returns the list of names of the teams
         */
        getTeamNames(teamGroupName?: string): string[];
        /**
         * Returns the list of player IDs in a team.
         * Player objects can be recovered from the `world.getPlayers()` list
         *
         * @param world - world to extract the player list from
         * @param teamName - name of the team to add to
         * - non existing teams are ignored
         * @param teamGroupName - name of the group where the team exists
         * - undefined redirects to the "Default" group
         * - non existing groups are ignored
         * @returns the list of player IDs
         */
        getTeamPlayers(world: World, teamName: string, teamGroupName?: string): Player[];
    };
    /**
     * Changes the visible state of a shop configured as an overlay element
     *
     * @param player - the player who will be seeing the shop overlay change state
     * @param shopGizmo - the entity Gizmo of the shop
     * @param visible - the new state to set to the shop
     */
    setShopOverlayVisible(player: Player, shopGizmo: Entity, visible: boolean): Promise<void>;
}
declare type PropTypeFromEnum<T> = T extends typeof PropTypes.Number ? number : T extends typeof PropTypes.String ? string : T extends typeof PropTypes.Boolean ? boolean : T extends typeof PropTypes.Vec3 ? Vec3 : T extends typeof PropTypes.Color ? Color : T extends typeof PropTypes.Entity ? Entity : T extends typeof PropTypes.Quaternion ? Quaternion : T extends typeof PropTypes.Player ? Player : T extends typeof PropTypes.Asset ? Asset : T extends typeof PropTypes.NumberArray ? Array<number> : T extends typeof PropTypes.StringArray ? Array<string> : T extends typeof PropTypes.BooleanArray ? Array<boolean> : T extends typeof PropTypes.Vec3Array ? Array<Vec3> : T extends typeof PropTypes.ColorArray ? Array<Color> : T extends typeof PropTypes.EntityArray ? Array<Entity> : T extends typeof PropTypes.QuaternionArray ? Array<Quaternion> : T extends typeof PropTypes.PlayerArray ? Array<Player> : T extends typeof PropTypes.AssetArray ? Array<Asset> : never;
declare type AllPropTypes = (typeof PropTypes)[keyof typeof PropTypes];
declare type NonNullablePropTypes = Exclude<AllPropTypes, NullablePropTypes>;
declare type NullablePropTypes = typeof PropTypes.Entity | typeof PropTypes.Player | typeof PropTypes.Asset;
/**
 * Represents the properties that are used to initialize a component.
 * Used to provide inputs on instances in the UI.
 */
export declare type PropsFromDefinitions<T> = {
    [K in keyof T]: T[K] extends never ? never : T[K] extends {
        type: NullablePropTypes;
        default?: never;
    } ? Readonly<PropTypeFromEnum<T[K]['type']>> | undefined : T[K] extends {
        type: NonNullablePropTypes;
        default?: PropTypeFromEnum<NonNullablePropTypes>;
    } ? Readonly<PropTypeFromEnum<T[K]['type']>> : never;
};
declare type GetPropsFromComponentOrPropsDefinition<T> = T extends ComponentWithoutConstructor<infer _U> ? PropsFromDefinitions<PropsDefinitionFromComponent<T>> : PropsFromDefinitions<T>;
declare type ComponentWithoutConstructor<TPropsDefinition> = {
    propsDefinition?: TPropsDefinition;
};
/**
 * The base type of a component which takes a prop definition. This
 * can be used to default props for a base component
 */
export declare type ComponentWithConstructor<TPropsDefinition, S extends SerializableState = SerializableState> = ComponentWithoutConstructor<TPropsDefinition> & {
    new (): Component<ComponentWithConstructor<TPropsDefinition, S>, S>;
};
/**
 * Helper utility to derive prop types from a component class type
 */
export declare type PropsDefinitionFromComponent<T> = T extends ComponentWithoutConstructor<infer TPropsDefinition> ? Readonly<TPropsDefinition> : never;
/**
 * Built-in CodeBlock events.
 */
export declare const CodeBlockEvents: {
    /**
     * The event that is triggered when the player enters a trigger zone.
     */
    OnPlayerEnterTrigger: CodeBlockEvent<[enteredBy: Player]>;
    /**
     * The event that is triggered when a player leaves a trigger zone.
     */
    OnPlayerExitTrigger: CodeBlockEvent<[exitedBy: Player]>;
    /**
     * The event that is triggered when an entity enters a trigger zone.
     */
    OnEntityEnterTrigger: CodeBlockEvent<[enteredBy: Entity]>;
    /**
     * The event that is triggered when an entity exits a trigger zone.
     */
    OnEntityExitTrigger: CodeBlockEvent<[enteredBy: Entity]>;
    /**
     * The event that is triggered when a player collides with something.
     */
    OnPlayerCollision: CodeBlockEvent<[collidedWith: Player, collisionAt: Vec3, normal: Vec3, relativeVelocity: Vec3, localColliderName: string, OtherColliderName: string]>;
    /**
     * The event that is triggered when an entity collides with something.
     */
    OnEntityCollision: CodeBlockEvent<[collidedWith: Entity, collisionAt: Vec3, normal: Vec3, relativeVelocity: Vec3, localColliderName: string, OtherColliderName: string]>;
    /**
     * The event that is triggered when a player enters the world.
     */
    OnPlayerEnterWorld: CodeBlockEvent<[player: Player]>;
    /**
     * The event that is triggered when a player exits the world.
     */
    OnPlayerExitWorld: CodeBlockEvent<[player: Player]>;
    /**
     * The event that is triggered when a grab starts.
     */
    OnGrabStart: CodeBlockEvent<[isRightHand: boolean, player: Player]>;
    /**
     * The event that is triggered when a grab is ended.
     */
    OnGrabEnd: CodeBlockEvent<[player: Player]>;
    /**
     * The event that is triggered when a multi grab starts.
     */
    OnMultiGrabStart: CodeBlockEvent<[player: Player]>;
    /**
     * The event that is triggered when a multi grab is ended.
     */
    OnMultiGrabEnd: CodeBlockEvent<[player: Player]>;
    /**
     * The event that is triggered when the index finger button is pressed.
     */
    OnIndexTriggerDown: CodeBlockEvent<[player: Player]>;
    /**
     * The event that is triggered when the index finger button is released.
     */
    OnIndexTriggerUp: CodeBlockEvent<[player: Player]>;
    /**
     * The event that is triggered when the button 1 is pressed.
     */
    OnButton1Down: CodeBlockEvent<[player: Player]>;
    /**
     * The event that is triggered when the button 1 is released.
     */
    OnButton1Up: CodeBlockEvent<[player: Player]>;
    /**
     * The event that is triggered when the button 2 is pressed.
     */
    OnButton2Down: CodeBlockEvent<[player: Player]>;
    /**
     * The event that is triggered when the button 2 is released.
     */
    OnButton2Up: CodeBlockEvent<[player: Player]>;
    /**
     * The event that is triggered when an attachment is attached.
     */
    OnAttachStart: CodeBlockEvent<[player: Player]>;
    /**
     * The event that is triggered when an attachment is detached.
     */
    OnAttachEnd: CodeBlockEvent<[player: Player]>;
    /**
     * The event that is triggered when a projectile is launched.
     */
    OnProjectileLaunched: CodeBlockEvent<[launcher: Entity]>;
    /**
     * The event that is triggered when a projectile hits a player.
     */
    OnProjectileHitPlayer: CodeBlockEvent<[playerHit: Player, position: Vec3, normal: Vec3, headshot: boolean]>;
    /**
     * The event that is triggered when a projectile hits an entity.
     */
    OnProjectileHitEntity: CodeBlockEvent<[entityHit: Entity, position: Vec3, normal: Vec3, isStaticHit: boolean]>;
    /**
     * @deprecated This event has been deprecated in favor of {@link BuiltInEvents.OnProjectileHitEntity}
     */
    OnProjectileHitObject: CodeBlockEvent<[objectHit: Entity, position: Vec3, normal: Vec3]>;
    /**
     * @deprecated This event has been deprecated in favor of {@link BuiltInEvents.OnProjectileHitEntity}
     */
    OnProjectileHitWorld: CodeBlockEvent<[position: Vec3, normal: Vec3]>;
    /**
     * The event that is triggered when an achievement is completed.
     */
    OnAchievementComplete: CodeBlockEvent<[player: Player, scriptId: string]>;
    /**
     * The event that is triggered when camera photo is taken.
     */
    OnCameraPhotoTaken: CodeBlockEvent<[player: Player, isSelfie: boolean]>;
    /**
     * The event that is triggered when an item is successfully purchased.
     */
    OnItemPurchaseSucceeded: CodeBlockEvent<[player: Player, item: string]>;
    /**
     * The event that is triggered when an item purchase fails.
     */
    OnItemPurchaseFailed: CodeBlockEvent<[player: Player, item: string]>;
    /**
     * The event that is triggered when an item is successfully consumed.
     */
    OnPlayerConsumeSucceeded: CodeBlockEvent<[player: Player, item: string]>;
    /**
     * The event that is triggered when an item consume fails.
     */
    OnPlayerConsumeFailed: CodeBlockEvent<[player: Player, item: string]>;
    /**
     * The event that is triggered when an item is spawned from the inventory.
     */
    OnPlayerSpawnedItem: CodeBlockEvent<[player: Player, item: Entity]>;
    /**
     * The event that is triggered when an asset is spawned.
     */
    OnAssetSpawned: CodeBlockEvent<[entity: Entity, asset: Asset]>;
    /**
     * The event that is triggered when an asset is despawned.
     */
    OnAssetDespawned: CodeBlockEvent<[entity: Entity, asset: Asset]>;
    /**
     * The event that is triggered when an asset spawn fails.
     */
    OnAssetSpawnFailed: CodeBlockEvent<[asset: Asset]>;
    /**
     * The event that is triggered when an audio playback has completed.
     */
    OnAudioCompleted: CodeBlockEvent<[]>;
    /**
     * The event that is triggered when a player goes AFK (opens the Oculus menu, takes their headset off, etc)
     */
    OnPlayerEnterAFK: CodeBlockEvent<[player: Player]>;
    /**
     * The event that is triggered when a player comes back from being AFK.
     */
    OnPlayerExitAFK: CodeBlockEvent<[player: Player]>;
    OnPlayerEnteredFocusedInteraction: CodeBlockEvent<[player: Player]>;
    OnPlayerExitedFocusedInteraction: CodeBlockEvent<[player: Player]>;
    OnPlayerChangedTeam: CodeBlockEvent<[player: Player, teamName: string, teamGroupName: string]>;
};
/**
 * Content of the data sent when a player purchases an item from an in-world shop
 */
export declare type OnPlayerPurchasedItemEventPayload = {
    /**
     * Id of the player making the purchase
     */
    playerId: number;
    /**
     * Id of the shop gizmo being used
     */
    shopId: number;
    /**
     * Sku of the item being used to make the purchase
     * SKU (Stock-Keeping Unit): A unique identifier for a product or service
     */
    consumedItemSku: string;
    /**
     * Number of consumed items
     */
    consumedItemQuantity: number;
    /**
     * Sku of the item being purchased
     */
    grantItemSku: string;
    /**
     * Number of purchased items
     */
    grantItemQuantity: number;
};
/**
 * List of in world shop features
 */
export declare const InWorldShopHelpers: {
    /**
     * Event sent when a player purchases an item from an in-world shop.
     * As this event goes through communication with the server,
     * it might be received with some delay after pressing the shop button.
     *
     * How to use it
     * In your script, connect to this network event using:
     * this.connectNetworkBroadcastEvent(
     *   hz.InWorldShopEvents.OnPlayerPurchasedItemEvent,
     *   (payload) => { ** add your code here ** }
     * );
     */
    OnPlayerPurchasedItemEvent: NetworkEvent<OnPlayerPurchasedItemEventPayload>;
};
/**
 * Represents the target or destination of an event.
 *
 * @privateRemarks
 * This needs to be synced with enums in C++ (IScriptingRuntime.cpp)
 * and C# (IScriptingRuntime.cs)
 */
export declare enum EventTargetType {
    Entity = 0,
    Player = 1,
    Broadcast = 2
}
declare type TimerHandler = (...args: unknown[]) => void;
/**
 * A callback used to perform a single registered dispose operation, either automatically at
 * the {@link DisposableObject}'s dispose time, or manually before dispose.
 */
export declare type DisposeOperation = () => void;
/**
 * The object returned from a call to {@link DisposableObject.registerDisposeOperation}. This
 * object can be used to run the operation manually before dispose time, or to cancel the
 * operation entirely.
 */
export interface DisposeOperationRegistration {
    /**
     * Manually run the dispose operation before the {@link DisposableObject} is disposed.
     * Dispose operations are only run once--a call to run guarantees the operation will
     * not run at dispose time.
     */
    run: () => void;
    /**
     * Cancels the dispose operation so that it is never runs.
     */
    cancel: () => void;
}
/**
 * An interface for objects that allow registration of additional dispose time operations.
 * Implemented by {@link Component}, this is typically used to tie the lifetime of API objects
 * to the lifetime of the {@link Component} that uses them. However, creators can register
 * their own operations (in lieu of implementing dispose), or can implement their own Disposable
 * Object for advanced scenarios requiring custom lifetime management.
 * The implementation of DisposableObject on {@link Component} runs the dispose operations when
 * the Component is destroyed (such as at world teardown or asset despawn), or when ownership
 * is transferred between clients. Other implementations of DisposableObject may have different
 * semantics.
 */
export interface DisposableObject {
    /**
     * Called when the disposable object is cleaned up
     */
    dispose(): void;
    /**
     * Called to register a single dispose operation. The operation will be run automatically
     * at Object dispose time, unless it is manually run or canceled before the object is disposed.
     * @param operation - A function called to perform a single dispose operation.
     * @returns A registration object which can be used to manually run or cancel the operation before dispose.
     */
    registerDisposeOperation(operation: DisposeOperation): DisposeOperationRegistration;
}
/**
 * The core Component class.
 * This is extended to create new scripts that can be attached to entities in the world,
 * and to create new behaviors in Horizon.
 */
export declare abstract class Component<TComponent = ComponentWithConstructor<Record<string, unknown>>, TSerializableState extends SerializableState = SerializableState> implements DisposableObject {
    static propsDefinition: {};
    protected static __scriptName: string | null;
    private __registeredDisposeOperations;
    private __disposeOperations;
    private __timeoutIds;
    private __intervalIds;
    readonly entityId: number;
    readonly props: GetPropsFromComponentOrPropsDefinition<TComponent>;
    /**
     * The entity the component is attached to
     */
    readonly entity: Entity;
    /**
     * The Horizon world
     */
    readonly world: World;
    /**
     * Initialization logic prior to component `start` being called.
     * - World start: `preStart` is guaranteed to run for all components before  any component's `start` method is called
     * - Asset spawn: `preStart` guaranteed to run before all `start` methods of components being spawned
     * - Ownership transfer: `preStart` will be called directly before `start`
     */
    preStart(): void;
    /**
     * Called when the component is started.
     */
    abstract start(): void;
    /**
     * Called when the component is cleaned up.
     *
     * Subscriptions registered using `connectCodeBlockEvent`, `connectLocalBroadcastEvent` and
     * `connectLocalEvent` as well as timers registered using `async` APIs are
     * cleaned up automatically.
     */
    dispose(): void;
    /**
     * Called to register a single dispose operation. The operation will be run automatically
     * at Component dispose time, unless it is manually run or canceled before the Component is disposed.
     * @param operation - A function called to perform a single dispose operation.
     * @returns A registration object which can be used to manually run or cancel the operation before dispose.
     */
    registerDisposeOperation(operation: DisposeOperation): DisposeOperationRegistration;
    private __registerEventDisposeOperation;
    private __removeDisposeOperation;
    private __clearAllTimeoutsAndIntervals;
    /**
     * Sends an event using the existing/legacy event system. These events are networked automatically.
     * The event is sent and handled asynchronously.
     * @param target - The (Entity or Player) target to which the event is sent.
     * @param event - The CodeBlockEvent.
     * @param args - The data to send with the event.
     */
    sendCodeBlockEvent<TPayload extends BuiltInVariableType[]>(target: Entity | Player, event: CodeBlockEvent<TPayload>, ...args: TPayload): void;
    /**
     * Called when receiving the specified CodeBlock event from the given target.
     * @param target - The (Entity or Player) target to listen to.
     * @param event - The CodeBlockEvent.
     * @param callback - Called when the event is received with any data as arguments.
     */
    connectCodeBlockEvent<TEventArgs extends BuiltInVariableType[], TCallbackArgs extends TEventArgs>(target: Entity | Player, event: CodeBlockEvent<TEventArgs>, callback: (...payload: TCallbackArgs) => void): EventSubscription;
    /**
     * Sends an event locally to a specific entity from the owner of the entity.
     * it is sent immediately; this function does not return until delivery has completed.
     * @param target - The target to which the event is sent.
     * @param event - the local event.
     * @param args - The data to send with the event.
     */
    sendLocalEvent<TPayload extends LocalEventData, TData extends TPayload>(target: Entity | Player, event: LocalEvent<TPayload>, data: TData): void;
    /**
     * add a listener to the specified local event on the entity. The listener is called when the event is received.
     * @param target - The target to listen to.
     * @param event - a local event.
     * @param callback - Called when the event is received with any data as arguments.
     */
    connectLocalEvent<TPayload extends LocalEventData>(target: Entity | Player, event: LocalEvent<TPayload>, callback: (payload: TPayload) => void): EventSubscription;
    /**
     * Sends an event locally to all listeners.
     * If it's a local event, it is sent immediately; this function does not return until delivery has completed.
     * @param event - A local event or network event.
     * @param args - The data to send With the event.
     */
    sendLocalBroadcastEvent<TPayload extends LocalEventData, TData extends TPayload>(event: LocalEvent<TPayload>, data: TData): void;
    /**
     * add a listener to the specified local event. The listener is called when the event is received.
     * @param event - the local event.
     * @param listener - Called when the event is received with any data as arguments.
     */
    connectLocalBroadcastEvent<TPayload extends LocalEventData>(event: LocalEvent<TPayload>, listener: (payload: TPayload) => void): EventSubscription;
    /**
     * Sends an event to the owner of the specific entity through network. The event is handled only
     * if connectNetworkEvent is called on the same entity on the owner client.
     * @param target - The target to which the event is sent
     * @param event - the network event.
     * @param data - The data to send with the event. the maximum amount data after serialization is 63kB
     * @param players - The list of players' devices to send the event to. If it's undefined, sends to all. only use it if you know what you are doing.
     */
    sendNetworkEvent<TPayload extends NetworkEventData>(target: Entity | Player, event: NetworkEvent<TPayload>, data: TPayload, players?: Array<Player>): void;
    /**
     * add a listener to the specified local event on the entity. The listener is called when the event
     * is received from network.
     * @param target - The target to listen to.
     * @param event - the network event.
     * @param callback - Called when the event is received with any data as arguments.
     */
    connectNetworkEvent<TPayload extends NetworkEventData>(target: Entity | Player, event: NetworkEvent<TPayload>, callback: (payload: TPayload) => void): EventSubscription;
    /**
     * Broadcasts an event over the network. The event is handled only if the host listens to the event.
     * @param event - A local event or network event.
     * @param data - The data to send with the event. the maximum amount data after serialization is 63kB
     * @param players - The list of players' devices to send the event to. If it's undefined, sends to all. only use it if you know what you are doing.
     */
    sendNetworkBroadcastEvent<TPayload extends NetworkEventData>(event: NetworkEvent<TPayload>, data: TPayload, players?: Array<Player>): void;
    /**
     * add a listener to the specified network event. The listener is called when the event is received from the network.
     * @param event - the network event.
     * @param callback - Called when the event is received with any data as arguments.
     */
    connectNetworkBroadcastEvent<TPayload extends NetworkEventData>(event: NetworkEvent<TPayload>, callback: (payload: TPayload) => void): EventSubscription;
    /**
     * Called when the script's ownership is being transferred to a new player. This
     * method allows the new owner to receive the serializable state from the previous
     * owner during ownership transfer.
     *
     * @remarks When changing entity ownership to a new player, you must transfer
     * the state of the entity as well or the state will be lost. You can use the
     * {@link Component.transferOwnership} and {@link Component.receiveOwnership}
     * methods to transfer an entity's state to a new owner. For more information,
     * see {@link https://developers.meta.com/horizon-worlds/learn/documentation/typescript/local-scripting/maintaining-local-state-on-ownership-change | Maintaining local state on ownership change}.
     *
     * If ownership for a parent entity changes, the ownership change doesn't
     * automatically apply to any child entities.
     *
     * @example
     * ```
     * type State = {ammo: number};
     * class WeaponWithAmmo extends Component<typeof WeaponWithAmmo, State> {
     *   static propsDefinition = {
     *     initialAmmo: {type: PropTypes.Number, default: 20},
     *   };
     *   private ammo: number = 0;
     *   start() {
     *     this.ammo = this.props.initialAmmo;
     *   }
     *   receiveOwnership(state: State | null, fromPlayer: Player, toPlayer: Player) {
     *     this.ammo = state?.ammo ?? this.ammo;
     *   }
     *   transferOwnership(fromPlayer: Player, toPlayer: Player): State {
     *     return {ammo: this.ammo};
     *   }
     * }
     * ```
     *
     * @param _serializableState - The serializable state from prior owner, or null
     * if that state is invalid.
     * @param _oldOwner - The prior owner.
     * @param _newOwner - The current owner.
     */
    receiveOwnership(_serializableState: TSerializableState | null, _oldOwner: Player, _newOwner: Player): void;
    /**
     * Called when transferring the script's ownership to a new player. During the transer,
     * this method can condense the previous owner's state into a serializable
     * format and pass it to the new owner.
     *
     * @remarks When changing entity ownership to a new player, you must transfer
     * the state of the entity as well or the state will be lost. You can use the
     * {@link Component.transferOwnership} and {@link Component.receiveOwnership}
     * methods to transfer an entity's state to a new owner. For more information,
     * see {@link https://developers.meta.com/horizon-worlds/learn/documentation/typescript/local-scripting/maintaining-local-state-on-ownership-change | Maintaining local state on ownership change}.
     *
     * If ownership for a parent entity changes, the ownership change doesn't
     * automatically apply to any child entities.
     *
     * @example
     * ```
     * type State = {ammo: number};
     * class WeaponWithAmmo extends Component<typeof WeaponWithAmmo, State> {
     *   static propsDefinition = {
     *     initialAmmo: {type: PropTypes.Number, default: 20},
     *   };
     *   private ammo: number = 0;
     *   start() {
     *     this.ammo = this.props.initialAmmo;
     *   }
     *   receiveOwnership(state: State | null, fromPlayer: Player, toPlayer: Player) {
     *     this.ammo = state?.ammo ?? this.ammo;
     *   }
     *   transferOwnership(fromPlayer: Player, toPlayer: Player): State {
     *     return {ammo: this.ammo};
     *   }
     * }
     * ```
     *
     * @param _oldOwner - The original owner.
     * @param _newOwner - The new owner.
     * @returns The serializable state to transfer to the new owner.
     */
    transferOwnership(_oldOwner: Player, _newOwner: Player): TSerializableState;
    /**
     * Async helpers. Scoped to the component for automatic cleanup on dispose
     */
    async: {
        /**
         * Sets a timer which executes a function or specified piece of code once the timer expires.
         * @param callback - A function to be compiled and executed after the timer expires.
         * @param timeout - The time, in milliseconds that the timer should wait before the specified function or code is executed.
         * If this parameter is omitted, a value of 0 is used, meaning execute "immediately", or more accurately, the next event cycle.
         * @param args - Additional arguments which are passed through to the function specified by callback.
         * @returns The timer created by the call to `setTimeout()`.
         * This value can be passed to `clearTimeout()` to cancel the timeout. It is guaranteed that a timeoutID value will never be reused
         * by a subsequent call to setTimeout() or setInterval() on the same object (a window or a worker).
         */
        setTimeout: (callback: TimerHandler, timeout?: number, ...args: unknown[]) => number;
        /**
         * Cancels a timeout previously established by calling `setTimeout()`.
         * If `id` does not identify a previously established action, this method does nothing.
         * @param id - The identifier of the timeout to cancel. This ID was returned by the corresponding call to `setTimeout()`.
         */
        clearTimeout: (id: number) => void;
        /**
         * Repeatedly calls a function or executes a code snippet, with a fixed time delay between each call.
         * @param callback - A function to be compiled and executed every timeout milliseconds.
         * The first execution happens after delay milliseconds.
         * @param timeout - (optional) The duration, in milliseconds (thousandths of a second), the timer should delay
         * in between executions of the specified function or code. Defaults to 0 if not specified.
         * @param arguments - (optional) Additional arguments which are passed through to the function specified by callback.
         * @returns The numeric, non-zero value which identifies the timer created by the call to setInterval();
         * this value can be passed to clearInterval() to cancel the interval.
         */
        setInterval: (callback: TimerHandler, timeout?: number, ...args: unknown[]) => number;
        /**
         * Cancels a timed, repeating action which was previously established by a call to `setInterval()`.
         * If the parameter does not identify a previously established action, this method does nothing.
         * @param id - The identifier of the repeated action you want to cancel. This ID was returned by the corresponding call to `setInterval()`.
         */
        clearInterval: (id: number) => void;
    };
    /**
     * Registers a component definition so that it can be attached to an object in the UI.
     * @param componentClass - The Typescript class of the component.
     * @param componentName - The name of component as you want it to appear in the UI.
     */
    static register<TComponentPropsDefinition>(componentClass: // this needs to be typed with the interface type so we know it can be instantiated (is not abstract)
    ComponentWithConstructor<TComponentPropsDefinition> & typeof Component<ComponentWithConstructor<TComponentPropsDefinition>>, componentName?: string): void;
}
/**

 * Represents a Custom model {@link Entity}.
 * Note that a custom model is built outside of Horizon,
 * with a 3D modeling tool,
 * exported as .fbx file,
 * and finally ingested to the asset library with asset pipeline.
 */
export declare class MeshEntity extends Entity {
    /**
     * Gets a human readable representation of the object.
     * @returns a string representation of this object.
     */
    toString(): string;
    style: EntityStyle;
    /**
     * Changes the texture of a Custom model entity.
     * @remarks This API should only be applied to a Custom model that uses a texture based material.
     * Additionally, static/nondynamic entities may not update textures if the material shader is GI lit.
     * Otherwise, this call does not take effect and an error is thrown at runtime.
     * @param texture - the asset containing the texture to apply. The asset must be a texture asset that has been ingested as texture in the asset pipeline.
     * @returns a promise that resolves when the texture has been successfully applied.
     * @example
     * ```
     * import { Component, PropTypes, Entity, AudioGizmo, CodeBlockEvents, Asset } from '@early_access_api/v1';
     * import { MeshEntity, TextureAsset } from '@early_access_api/2p';
     *
     * class Button extends Component<typeof Button> {
     *   static propsDefinition = {
     *     texture: {type: PropTypes.Asset},
     *     panel: {type: PropTypes.Entity},
     *     sound: {type: PropTypes.Entity},
     *   };
     *
     *   start() {
     *     this.connectCodeBlockEvent(this.entity, CodeBlockEvents.OnPlayerEnterTrigger, () => this.onClick());
     *   }
     *
     *   onClick() {
     *     this.props.sound.as(AudioGizmo).play();
     *     this.props.panel.as(MeshEntity).setTexture(this.props.texture.as(TextureAsset));
     *   }
     * }
     *
     * Component.register(Button);
  ```
     */
    setTexture(texture: TextureAsset): Promise<void>;
    /**
     * Changes the mesh (and possibly material) of a Custom model entity.
     * @remarks This API should only be applied to a Custom model. Otherwise, this call does not take effect.
     * @param mesh - the custom model asset you want to swap into (bring into) the world.
     * The asset must be a custom model asset that has been ingested as a custom model in the asset pipeline (cannot be a custom model asset that has been saved as an asset within Horizon).
     * @param options - Optional parameters, currently containing a boolean where users can decide to use the new material that comes with the new custom model or just keep the current material
     * @returns a promise that resolves when the mesh (and material) has been successfully swapped.
     * @example
     * ```
     * import { Component, PropTypes, Entity, AudioGizmo, CodeBlockEvents, Asset } from '@early_access_api/v1';
     * import { MeshEntity, TextureAsset } from '@early_access_api/v1';
     *
     * class TargetEntity extends Component<{}> {
     *    static propsDefinition = {};
     *
     *    start() {
     *        this.connectLocalEvent(this.entity, buttonPressedEvent, (data: {mesh: Asset}) => {
     *        this.entity.as(MeshEntity).setMesh(data.mesh, {updateMaterial: false});
     *     });
     *   }
     * }
     *
     * type ButtonProps = {
     *   mesh: Asset,
     *   targetEntity: Entity,
     * };
     *
     * class Button extends Component<ButtonProps> {
     *   static propsDefinition = {
     *     mesh: {type: PropTypes.Asset},
     *     targetEntity: {type: PropTypes.Entity},
     *   };
     *
     *   start() {
     *     this.connectCodeBlockEvent(this.entity, CodeBlockEvents.OnPlayerEnterTrigger, () => this.onClick());
     *   }
     *
     *   onClick() {
     *     this.sendLocalEvent(this.props.targetEntity, buttonPressedEvent, {mesh: this.props.mesh.as(Asset)});
     *   }
     * }
     *
     * Component.register(Button);
  ```
     */
    setMesh(mesh: Asset, options: SetMeshOptions): Promise<void>;
    /**
     * Sets the material on a custom model entity using a material asset.
     * @param materialAsset - A material asset from the asset library.
     * @returns a promise that resolves when the material has been successfully updated.
     */
    setMaterial(materialAsset: MaterialAsset): Promise<void>;
}
export declare type SetMeshOptions = {
    updateMaterial?: boolean;
};
/**
 * Represents a texture {@link Asset}.
 * A texture is a binary image that is applied over the mesh surface.
 * Texture images can be stretched (or shrunk) and attached to a mesh.
 */
export declare class TextureAsset extends Asset {
    /**
     * Gets a human readable representation of the object.
     * @returns a string representation of this asset.
     */
    toString(): string;
}
/**
 * Represents a material {@link Asset}.
 * A material describes how the surface of a mesh will be rendered
 */
export declare class MaterialAsset extends Asset {
    /**
     * Gets a human readable representation of the object.
     * @returns a string representation of this asset.
     */
    toString(): string;
}
/**
 * Represents a style for a Custom model entity that can change its style.
 */
export interface EntityStyle {
    /**
     * @example
     * ```
     * // Augment base color as such:
     *
     * outColor.rgb = lerp(inColor.rgb, Luminance(inColor.rgb) * tintColor, tintStrength) * brightness;
     * ```
     */
    /**
     * Color in the RGB range of 0 - 1; defaults to 1, 1, 1 (no tint color).
     */
    tintColor: HorizonProperty<Color>;
    /**
     * Tint strength in the range of 0 - 1; where 0 is no tint and 1 is fully tinted; defaults to 0.
     */
    tintStrength: HorizonProperty<number>;
    /**
     * Brightness in the range of 0 - 100; where 0 is black, 1 is no adjustment, and 100 is very bright; defaults to 1.
     */
    brightness: HorizonProperty<number>;
}
/**
 * The icons to use when binding to custom player inputs. These are used on platforms
 * that display buttons for inputs.
 */
export declare enum ButtonIcon {
    /**
     * The icon for Ability.
     */
    Ability = 0,
    /**
     * The icon for Aim.
     */
    Aim = 1,
    /**
     * The icon for Airstrike.
     */
    Airstrike = 2,
    /**
     * The icon for Crouch.
     */
    Crouch = 3,
    /**
     * The icon for Door.
     */
    Door = 4,
    /**
     * The icon for Drink.
     */
    Drink = 5,
    /**
     * The icon for Drop.
     */
    Drop = 6,
    /**
     * The icon for Dual Wield.
     */
    DualWield = 7,
    /**
     * The icon for Eagle Eye.
     */
    EagleEye = 8,
    /**
     * The icon for Eat.
     */
    Eat = 9,
    /**
     * The icon for Fire Special.
     */
    FireSpecial = 10,
    /**
     * The icon for Fire.
     */
    Fire = 11,
    /**
     * The icon for Grab.
     */
    Grab = 12,
    /**
     * The icon for Heal.
     */
    Heal = 13,
    /**
     * The icon for Infinite Ammo.
     */
    InfiniteAmmo = 14,
    /**
     * The icon for Inspect.
     */
    Inspect = 15,
    /**
     * The icon for Interact.
     */
    Interact = 16,
    /**
     * The icon for invisible.
     */
    Invisible = 17,
    /**
     * The icon for Jump.
     */
    Jump = 18,
    /**
     * The icon for House Left.
     */
    MouseLeft = 19,
    /**
     * The icon for Mouse Middle.
     */
    MouseMiddle = 20,
    /**
     * The icon for Mouse Right.
     */
    MouseRight = 21,
    /**
     * The icon for Mouse Scroll.
     */
    MouseScroll = 22,
    /**
     * The icon for Net.
     */
    Net = 23,
    /**
     * The icon for None.
     */
    None = 24,
    /**
     * The icon for Place.
     */
    Place = 25,
    /**
     * The icon for Purchase.
     */
    Purchase = 26,
    /**
     * The icon for Reload.
     */
    Reload = 27,
    /**
     * The icon for Rocket Jump.
     */
    RocketJump = 28,
    /**
     * The icon for Rocket Volley.
     */
    RocketVolley = 29,
    /**
     * The icon for Rocket.
     */
    Rocket = 30,
    /**
     * The icon for Shield.
     */
    Shield = 31,
    /**
     * The icon for Speak.
     */
    Speak = 32,
    /**
     * The icon for Special.
     */
    Special = 33,
    /**
     * The icon for Speed Boost.
     */
    SpeedBoost = 34,
    /**
     * The icon for Sprint.
     */
    Sprint = 35,
    /**
     * The icon for Swap.
     */
    Swap = 36,
    /**
     * The icon for Swing Weapon.
     */
    SwingWeapon = 37,
    /**
     * The icon for Throw.
     */
    Throw = 38,
    /**
     * The icon for Use.
     */
    Use = 39,
    /**
     * The icon for Punch.
     */
    Punch = 40,
    /**
     * The icon for Expand.
     */
    Expand = 41,
    /**
     * The icon for Contract.
     */
    Contract = 42,
    /**
     * The icon for Map.
     */
    Map = 43,
    /**
     * The icon for ChevronLeft.
     */
    LeftChevron = 44,
    /**
     * The icon for ChevronRight.
     */
    RightChevron = 45,
    /**
     * The icon for Menu.
     */
    Menu = 46
}
/**
 * List of available button placements
 */
export declare enum ButtonPlacement {
    /**
     * The device's default placement for this button
     */
    Default = 0,
    /**
     * Centered. Bottom center of the screen on most devices.
     */
    Center = 1
}
/**
 * The input actions available for the local player. The actions are bound to
 * specific keys by default on multiple platforms.
 * @remarks
 * The member descriptions contain a list of the default bindings. The bindings are valid
 * with the user setting Jump Controls set to Press A button. These bindings are affected
 * by the Jump Controls user setting.
 */
export declare enum PlayerInputAction {
    /**
     * Oculus Touch: A
     * Desktop: spacebar
     * Mobile: on-screen button
     */
    Jump = 0,
    /**
     * Oculus Touch: right thumbstick click
     * Desktop: R
     * Mobile: on-screen button
     */
    RightPrimary = 1,
    /**
     * Oculus Touch: B
     * Desktop: F
     * Mobile: on-screen button
     */
    RightSecondary = 2,
    /**
     * Oculus Touch: _Unavailable_
     * Desktop: Y
     * Mobile: on-screen button
     */
    RightTertiary = 3,
    /**
     * Oculus Touch: right analog grip button
     * Desktop: E
     * Mobile: on-screen button
     */
    RightGrip = 4,
    /**
     * Oculus Touch: right analog trigger
     * Desktop: left mouse click
     * Mobile: on-screen button
     */
    RightTrigger = 5,
    /**
     * Oculus Touch: right stick X axis
     * Desktop: _Unavailable_
     * Mobile: _Unavailable_
     */
    RightXAxis = 6,
    /**
     * Oculus Touch: right stick Y axis
     * Desktop: _Unavailable_
     * Mobile: _Unavailable_
     */
    RightYAxis = 7,
    /**
     * Oculus Touch: X
     * Desktop: T
     * Mobile: on-screen button
     */
    LeftPrimary = 8,
    /**
     * Oculus Touch: Y
     * Desktop: G
     * Mobile: on-screen button
     */
    LeftSecondary = 9,
    /**
     * Oculus Touch: left thumbstick click
     * Desktop: H
     * Mobile: on-screen button
     */
    LeftTertiary = 10,
    /**
     * Oculus Touch: left analog grip button
     * Desktop: Q
     * Mobile: on-screen button
     */
    LeftGrip = 11,
    /**
     * Oculus Touch: left analog trigger
     * Desktop: right mouse click
     * Mobile: on-screen button
     */
    LeftTrigger = 12,
    /**
     * Oculus Touch: left stick X Axis
     * Desktop: A/D
     * Mobile: left stick X axis
     */
    LeftXAxis = 13,
    /**
     * Oculus Touch: left stick Y axis
     * Desktop: W/S
     * Mobile: left stick Y axis
     */
    LeftYAxis = 14
}
/**
 * A callback used to signal changes in the pressed state of a player input
 * @param action - The action that triggered this callback.
 * @param pressed - Whether the action was just pressed or released.
 */
export declare type PlayerInputStateChangeCallback = (action: PlayerInputAction, pressed: boolean) => void;
/**
 * A bound player input. It is created by calling
 * {@link PlayerControls.connectLocalInput}.
 */
export declare class PlayerInput {
    private _action;
    private _held;
    private _pressed;
    private _released;
    private _callback?;
    private _disconnect?;
    /**
     * Disconnects the input.
     * On platforms that display on-screen buttons for actions, the button will be removed.
     * Any callbacks registered to this instance will stop being called.
     */
    disconnect(): void;
    /**
     * Indicates whether the input is currently connected and active.
     */
    connected: ReadableHorizonProperty<boolean>;
    /**
     * The action this input is bound to.
     * For analog inputs, a pressed state corresponds to an axis value greater than 0.5 or lesser than -0.5.
     */
    action: ReadableHorizonProperty<PlayerInputAction>;
    /**
     * Indicates whether the input is being held active.
     * For analog inputs, a pressed state corresponds to an axis value greater than 0.5 or lesser than -0.5.
     */
    held: ReadableHorizonProperty<boolean>;
    /**
     * Indicates whether the input was pressed this frame.
     */
    pressed: ReadableHorizonProperty<boolean>;
    /**
     * Indicates whether the input was released this frame.
     */
    released: ReadableHorizonProperty<boolean>;
    /**
     * Gets the axis value, between 0 and 1.
     * If the input is digital, 0 or 1 will be returned.
     */
    axisValue: ReadableHorizonProperty<number>;
    /**
     * Registers a callback that is called when the input is pressed or released. For
     * analog inputs, a pressed state corresponds to an axis value greater than 0.5 or
     * lesser than -0.5.
     * @param callback - The callback that is called when the pressed state changes.
     */
    registerCallback(callback: PlayerInputStateChangeCallback): void;
    /**
     * Unregisters the currently registered callback, if any.
     */
    unregisterCallback(): void;
}
/**
 * Options that can be passed to {@link PlayerControls.connectLocalInput}.
 */
export declare type PlayerControlsConnectOptions = {
    /**
     * The button placement to use, if able. Certain platform might not support all
     * placements. Attempting to place multiple buttons at the same location will give
     * priority to the latest button enabled.
     */
    preferredButtonPlacement?: ButtonPlacement;
};
/**
 * Represents the information about an input received in Focused Interaction mode.
 * interactionIndex - An index for differentiating between simultaneous inputs. The first input is 0, the second is 1, etc.
 * screenPosition - The screen position of the input normalized to the range (0,0) to (1,1)
 * worldRayOrigin - The origin point of a ray into the world generated from the touch.
 * worldRayDirection - The direction vector of a ray into the world generated from the touch.
 */
export declare type InteractionInfo = {
    interactionIndex: number;
    screenPosition: Vec3;
    worldRayOrigin: Vec3;
    worldRayDirection: Vec3;
};
/**
 * Provides static methods to bind to, and query data about custom player input bindings.
 */
export declare class PlayerControls {
    /**
     * Indicates whether the action is supported on the current platform.
     * @remarks This function fails if called on the server. Connecting to an unsupported
     * input is allowed, but the input won't activate and its axis value will remain at 0.
     * @param action - The action to query.
     * @returns true if the action is supported on the current platform; otherwise, false.
     */
    static isInputActionSupported(action: PlayerInputAction): boolean;
    /**
     * Connects to input events for the local player.
     * @remarks This function fails if called on the server. On platforms that display
     * on-screen buttons for actions (such as mobile), displays a button with the
     * specified icon.
     * @param input - The action to respond to.
     * @param icon - The icon to use for the button, on platforms that display on-screen buttons for actions.
     * @param disposableObject - The {@link DisposableObject} that controls the lifetime of the connection
     * @param options - Connection options, see {@link PlayerControlsConnectOptions} for defaults.
     * @returns A {@link PlayerInput} instance that can be used to poll the status of the input, or register
     * a state change callback.
     */
    static connectLocalInput(input: PlayerInputAction, icon: ButtonIcon, disposableObject: DisposableObject, options?: PlayerControlsConnectOptions): PlayerInput;
    /**
     * Returns a list of names that represent the physical buttons or keys bound to the specified action.
     * @remarks This function fails if called on the server.
     * @param action - The action to get the key names for.
     * @returns An array of key names.
     */
    static getPlatformKeyNames(action: PlayerInputAction): Array<string>;
    /**
     * This event is broadcast when the player is in Focused Interaction mode and starts a touch/click.
     * This will only fire on the first frame of the input.
     * @param interactionInfo - An array containing all inputs that started this frame.
     */
    static readonly onFocusedInteractionInputStarted: LocalEvent<{
        interactionInfo: InteractionInfo[];
    }>;
    /**
     * This event is broadcast when the player is in Focused Interaction mode and touch/click input occurs.
     * This will fire on all frames of the input except for the first and last frame which will instead fire
     * onFocusedInteractionInputStarted & onFocusedInteractionInputEnded respectively.
     * @param interactionInfo - An array containing all inputs that continued this frame.
     */
    static readonly onFocusedInteractionInputMoved: LocalEvent<{
        interactionInfo: InteractionInfo[];
    }>;
    /**
     * This event is broadcast when the player is in Focused Interaction mode and ends a touch/click.
     * This will only fire on the frame that the input ends.
     * @param interactionInfo - An array containing all inputs that ended this frame.
     */
    static readonly onFocusedInteractionInputEnded: LocalEvent<{
        interactionInfo: InteractionInfo[];
    }>;
    /**
     * This event fires when an item is holstered or unholstered
     *
     * @param player - The player who's holstered items were updated.
     * @param items - The list of items that are currently holstered
     * @param grabbedItem - The item that the player is currently holding
     */
    static readonly onHolsteredItemsUpdated: LocalEvent<{
        player: Player;
        items: Entity[];
        grabbedItem: Entity;
    }>;
}
/**
 * Used only in internal tests for compatibility between v1 and v2
 */
export declare abstract class BaseTestComponent<_TProps extends unknown, TComponent extends ComponentWithConstructor<Record<string, unknown>>> extends Component<TComponent> {
}
export {};

}