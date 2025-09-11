declare module 'horizon/editor' {
/**
 * (c) Meta Platforms, Inc. and affiliates. Confidential and proprietary.
 *
 * @format
 */
import { EntityTagMatchOperation, Asset, Quaternion, Vec3, Color, LayerType, RaycastHit } from 'horizon/core';
export declare const ApiName = "editing";
export declare type ColorValue = string | Color;
export declare class BaseEditable {
    /**
     * Get the initial value of a gizmo's property
     * @param property - The property from ReactVrEntityStateFields to query
     * @returns The value of the property
     */
    protected getReactVrProperty<T>(property: ReactVrEntityStateFields): T;
    /**
     * Set the value of a gizmo's property.
     * @param property - The property from ReactVrEntityStateFields to modify
     * @param value - The new value
     */
    protected setReactVrProperty<T>(property: ReactVrEntityStateFields, value: T): Promise<void>;
}
export declare class EditableEntity extends BaseEditable {
    /**
     * The ID of the entity in the world.
     */
    readonly id: bigint;
    /**
     * Creates an entity in the world.
     *
     * @param id - The ID of the entity to create.
     *
     * @returns The new entity.
     */
    constructor(id: bigint);
    /**
     * Converts this entity to a more specific entity type.
     *
     * @param entityClass - The class to convert to
     * @returns A new instance of the specified entity class with the same ID
     */
    as<T extends EditableEntity>(entityClass: EntityClassType<T>): T;
    /**
     * Gets a human-readable representation of the entity.
     *
     * @returns A string representing the entity.
     */
    toString(): string;
    /**
     * Get the parent entity of a given entity
     * @returns The parent entity of the given EditableEntity, self is returned if the entity is already a root entity.
     */
    get parent(): EditableEntity;
    /**
     * Set the parent entity of this entity
     * @param parent - The parent entity to set, or null to make this entity a root entity
     */
    setParent(parent: EditableEntity | null): Promise<void>;
    /**
     * Get the children entities of a given entity
     * @returns The children entities of the given entity will be returned, empty list is returned if no children.
     */
    get children(): EditableEntity[];
    /**
     * Set the children entities of this entity
     * @param children - The array of child entities to set
     */
    setChildren(children: EditableEntity[]): Promise<void>;
    /**
     * Get the initial value of an entity's property
     * @param property - The property to query
     * @returns The value of the property
     */
    getEntityProperty<T>(property: EntityProperty): T;
    /**
     * Set the value of an entity's property. This will create an undo step per
     * property set, if you want to set multiple properties at once, use
     * `world.actionHistory.beginAction()` instead.
     * @param property - The property to modify
     * @param value - The new value
     */
    setEntityProperty<T>(property: EntityProperty, value: T): Promise<void>;
    /**
     * Get the type of the entity
     * @returns The type of the entity
     */
    getEntityType(): EditorEntityType;
    setPosition(position: Vec3): Promise<void>;
    setLocalPosition(localPosition: Vec3): Promise<void>;
    setRotation(rotation: Quaternion): Promise<void>;
    setLocalRotation(localRotation: Quaternion): Promise<void>;
    setLocalScale(localScale: Vec3): Promise<void>;
    setName(name: string): Promise<void>;
    setLocked(locked: boolean): Promise<void>;
    setObjectTag(objectTag: string): Promise<void>;
    setGameplayTags(gameplayTags: string[]): Promise<void>;
    setColor(color: ColorValue): Promise<void>;
    setText(text: string): Promise<void>;
    setCollidable(collidable: boolean): Promise<void>;
    setCollisionTag(collisionTag: string): Promise<void>;
    setVisible(visible: boolean): Promise<void>;
    /**
     * MotionType needs to be set to 'Interactive' before entities can be grabbed or
     * have physics enabled. This is done in the implementation of both
     * setGrabbable and setPhysicsEnabled.
     */
    setMotionType(motionType: MotionType): Promise<void>;
    get motionType(): MotionType;
    setPhysicsEnabled(physicsEnabled: boolean): Promise<void>;
    setGrabbable(isGrabbable: boolean): Promise<void>;
    get grabbableChoice(): GrabbableChoice;
    get position(): Vec3;
    get localPosition(): Vec3;
    get rotation(): Quaternion;
    get localRotation(): Quaternion;
    get scale(): Vec3;
    get localScale(): Vec3;
    get name(): string;
    get locked(): boolean;
    get objectTag(): string;
    get gameplayTags(): string[];
    get color(): ColorValue;
    get text(): string;
    get collidable(): boolean;
    get collisionTag(): string;
    get visible(): boolean;
    get scriptingCollisionsType(): ScriptingCollisionsType;
    setScriptingCollisionsType(type: ScriptingCollisionsType): Promise<void>;
    get collisionLayer(): ObjectCollisionLayers;
    setCollisionLayer(layer: ObjectCollisionLayers): Promise<void>;
    get collisionDisabled(): boolean;
    setCollisionDisabled(disabled: boolean): Promise<void>;
    /**
     * For scripts to receive OnCollisionEnter/Exit events, this value needs to be set.
     */
    get scriptingCollisionType(): ScriptingCollisionsType;
    /**
     * For scripts to receive OnCollisionEnter/Exit events, this value needs to be set.
     */
    setScriptingCollisionType(type: ScriptingCollisionsType): Promise<void>;
    /**
     * Get the attached script entities for a given entity.
     * @returns The script entities attached to the given EditableEntity, or empty list if none exists
     */
    getAttachedScript(): ScriptEntity;
    /**
     * Set the attached script entity for a given entity.
     * @param scriptEntity - The script entity to attach
     * @param tsComponentId - The TS component classname of the script entity to attach
     */
    setScript(scriptEntity: ScriptEntity, tsComponentId?: string): Promise<void>;
    /**
     * Get the value of an entity's attached script's variable override.
     * @param variableName - The name of the script variable to query
     * @returns The value of the variable override
     */
    getScriptVariable<T>(variableName: string): T;
    /**
     * Set the value of an entity's attached script's variable override.
     * @param variableName - The name of the script variable to modify
     * @param value - The new value for the variable override
     */
    setScriptVariable<T>(variableName: string, value: T): Promise<void>;
}
/**
 * The API for editing a world. See each property for more details.
 */
declare class EditorAPI {
    /**
     * Get the currently selected entities
     * @returns The currently selected entities
     */
    getSelected(): EditableEntity[];
    /**
     * Select the given entities, replacing the current selection
     * @param entities - The entities to select
     */
    select(entities: EditableEntity | EditableEntity[]): void;
    /**
     * Clear the current selection
     */
    clearSelection(): void;
    /**
     * The current world state, including the list of entities and their properties, as well as the world's metadata.
     */
    world: EditorWorld;
    /**
     * Undo the last action
     */
    undo(): Promise<ActionHistoryResult>;
    /**
     * Redo the last action
     */
    redo(): Promise<ActionHistoryResult>;
    /**
     * Get all root entities in the world
     * @returns All root entities in the world
     */
    getRootEntities(): EditableEntity[];
    /**
     * Get entity based on provided entity id
     * @param id - The entity id to query
     * @returns The entity matched to the id, null is returned if no entity found
     */
    findByID(id: string): EditableEntity | null;
    /**
     * Searches all world entities containing provided {@link tags | tags}, using {@link matchOperation | the provided match operation}.
     * @remarks This is an expensive operation and should be used carefully.
     * @privateRemarks As is, this is a naive implementation with arbitrary limits. As the API matures we should consider alternative
     * data structures and algorithms for efficient search of entities with given tags.
     * @param tags - An array of tag names to match against. The comparison is case sensitive.
     * @param matchOperation - The {@link EntityTagMatchOperation | match operation} to run when searching for entities with given tags.
     * Defaults to {@link EntityTagMatchOperation.HasAnyExact}.
     * @returns An array of all of the entities matching the tags and operation.
     */
    findByTags(tags: string[], matchOperation?: EntityTagMatchOperation): EditableEntity[];
    /**
     * @param name - name to match against. The comparison is case sensitive.
     * @returns An array of all of the entities matching the name.
     */
    findByName(name: string): EditableEntity[];
    /**
     * Get all entities of the specified type.
     * The returned entities will be automatically cast to the appropriate entity type.
     *
     * @param entityType - The type of entities to get
     * @returns An array of entities of the specified type
     */
    getByType<T extends EditorEntityType>(entityType: T): EntityTypeToClass[T][];
    getScriptByName(name: string): ScriptEntity | null;
    /**
     * Perform a raycast in edit mode
     * @param origin - The origin of the raycast
     * @param layerType - The layer type to raycast against
     * @param maxDistance - The maximum distance to raycast
     * @param stopOnFirstHit - Whether to stop the raycast on the first hit
     * @returns The result of the raycast
     */
    raycast(origin: Vec3, direction: Vec3, layerType?: LayerType, maxDistance?: number, stopOnFirstHit?: boolean): RaycastHit | null;
    spawnEmptyEntity(position: Vec3, rotation: Quaternion): Promise<EditableEntity>;
    /**
     * Spawn an entity of the specified type at the given position and rotation.
     * The returned entity will be automatically cast to the appropriate entity type.
     *
     * @param entityType - The type of entity to spawn
     * @param position - The position to spawn the entity at
     * @param rotation - The rotation to spawn the entity with
     * @returns A promise that resolves to the spawned entity with the appropriate type
     */
    spawnEntityByType<T extends EditorEntityType>(entityType: T, position: Vec3, rotation: Quaternion): Promise<EntityTypeToClass[T]>;
    /**
     * Spawn a script entity with the given name.
     *
     * @param scriptName - The name of the script
     * @returns A promise that resolves to the spawned script entity
     */
    spawnScript(scriptName: string, scriptCode?: string): Promise<ScriptEntity>;
    spawnText(name?: string): Promise<TextEntity>;
    spawnTrigger(name?: string): Promise<TriggerEntity>;
    spawnStaticLight(name?: string): Promise<StaticLightEntity>;
    spawnLight(name?: string): Promise<LightEntity>;
    spawnParticleFx(name?: string): Promise<ParticleFxEntity>;
    spawnTrailFx(name?: string): Promise<TrailFxEntity>;
    spawnRaycast(name?: string): Promise<RaycastEntity>;
    spawnProjectileLauncher(name?: string): Promise<ProjectileLauncherEntity>;
    spawnSpawnPoint(name?: string): Promise<SpawnPointEntity>;
    spawnCustomUIGizmo(name?: string): Promise<EditableEntity>;
    spawnSoundFx(name?: string): Promise<EditableEntity>;
    spawnAmbientAudio(name?: string): Promise<EditableEntity>;
    spawnSeat(name?: string): Promise<EditableEntity>;
    /**
     * Spawn a script entity and attach it to the given entity.
     *
     * @param entity - The entity to attach the script to
     * @param scriptName - The name of the script
     * @param scriptCode - The code of the script
     * @returns A promise that resolves when the script has been attached
     */
    spawnScriptAndAttachToEntity(entity: EditableEntity, scriptName: string, scriptCode: string): Promise<void>;
    spawnAsset(asset: number | bigint | Asset, position: Vec3, rotation?: Quaternion, scale?: Vec3): Promise<EditableEntity[]>;
    replace(entities: EditableEntity[], asset: number | bigint | Asset): Promise<void>;
    deleteEntities(entities: EditableEntity[], preserveChildren?: boolean): Promise<boolean>;
    /**
     * Begin a new undo stack. All entity property changes made between beginUndoStack()
     * and endUndoStack() will be grouped into a single undoable action.
     */
    beginUndoStack(): void;
    /**
     * End the current undo stack. All entity property changes made since the last
     * beginUndoStack() call will be combined into a single undoable action.
     */
    endUndoStack(): void;
}
/**
 * The current world state, including the list of entities and their properties, as well as the world's metadata.
 */
declare class EditorWorld {
    /**
     * The name of the world
     */
    get name(): string;
    /**
     * Update the name of the world
     * @param name - The new name
     */
    setName(name: string): Promise<void>;
}
/**
 * The properties of an entity.
 */
export declare enum EntityProperty {
    Position = 0,
    LocalPosition = 1,
    Rotation = 2,
    LocalRotation = 3,
    Scale = 4,
    LocalScale = 5,
    Name = 6,
    Locked = 7,
    ObjectTag = 8,
    GameplayTags = 9,
    Color = 10,
    Text = 11,
    Collidable = 12,
    CollisionTag = 13,
    MotionType = 14,
    Visible = 15
}
/**
 * Result of an action history
 */
export declare enum ActionHistoryResult {
    Fail = 0,
    Success = 1,
    Duplicate = 2,
    Disallowed = 3
}
export declare enum EditorEntityType {
    Text = "PrototypeTextLabel",
    Trimesh = "Trimesh",
    CustomUIGizmo = "CustomUI",
    EntityGroup = "EntityGroup",
    Trigger = "Trigger",
    StaticLight = "StaticLight",
    ParticleFx = "PrototypeParticleFx",
    TrailFx = "PrototypeTrailFx",
    Raycast = "Raycast",
    ProjectileLauncher = "ProjectileLauncher",
    AvatarMirror = "AvatarMirror",
    SoundFx = "PrototypeSoundFx",
    AmbientAudio = "PrototypeAmbientAudio",
    SpawnPoint = "SpawnPoint",
    Seat = "Seat",
    Light = "PrototypeLight"
}
declare enum ReactVrEntityStateFields {
    TextComponent_text = "TextComponent_text",
    TextComponent_shouldAutoFit = "TextComponent_shouldAutoFit",
    TextComponent_fixedFontSize = "TextComponent_fixedFontSize",
    TextComponent_useOptimisticFont = "TextComponent_useOptimisticFont",
    Trigger_disabled = "Trigger_disabled",
    Trigger_triggerType = "Trigger_triggerType",
    Trigger_objectTag = "Trigger_objectTag",
    Trigger_selectableInScreenMode = "Trigger_selectableInScreenMode",
    TrimeshColor_tintColor = "TrimeshColor_tintColor",
    TrimeshColor_tintStrength = "TrimeshColor_tintStrength",
    TrimeshColor_brightness = "TrimeshColor_brightness",
    Collision_scriptingCollisionsType = "Collision_scriptingCollisionsType",
    Collision_objectTag = "Collision_objectTag",
    Collision_collisionLayer = "Collision_collisionLayer",
    CollisionEnabled_collisionDisabled = "CollisionEnabled_collisionDisabled",
    Script_scriptExecutionContext = "Script_scriptExecutionContext",
    Script_friendlyName = "Script_friendlyName",
    Light_enabled = "Light_enabled",
    Light_lightType = "Light_lightType",
    Light_color = "Light_color",
    Light_intensity = "Light_intensity",
    Light_falloffDistance = "Light_falloffDistance",
    Light_spread = "Light_spread",
    StaticLight_enabled = "StaticLight_enabled",
    StaticLight_lightShape = "StaticLight_lightShape",
    StaticLight_color = "StaticLight_color",
    StaticLight_intensity = "StaticLight_intensity",
    ParticleFx_playOnStart = "ParticleFx_playOnStart",
    ParticleFx_looping = "ParticleFx_looping",
    ParticleFx_particlesFollowGizmo = "ParticleFx_particlesFollowGizmo",
    ParticleFx_preset = "ParticleFx_preset",
    TrailFx_playOnStart = "TrailFx_playOnStart",
    TrailFx_trailLength = "TrailFx_trailLength",
    TrailFx_trailWidth = "TrailFx_trailWidth",
    TrailFx_trailStartColor = "TrailFx_trailStartColor",
    TrailFx_trailEndColor = "TrailFx_trailEndColor",
    TrailFx_preset = "TrailFx_preset",
    Raycast_collideWith = "Raycast_collideWith",
    Raycast_objectTag = "Raycast_objectTag",
    Raycast_raycastDistance = "Raycast_raycastDistance",
    Raycast_stopOnFirstHit = "Raycast_stopOnFirstHit",
    ProjectileLauncher_projectileType = "ProjectileLauncher_projectileType",
    ProjectileLauncher_projectilePreset = "ProjectileLauncher_projectilePreset",
    ProjectileLauncher_projectileSpeed = "ProjectileLauncher_projectileSpeed",
    ProjectileLauncher_projectilesCollideWithPlayers = "ProjectileLauncher_projectilesCollideWithPlayers",
    ProjectileLauncher_projectilesCollideWithObjects = "ProjectileLauncher_projectilesCollideWithObjects",
    ProjectileLauncher_projectilesCollideWithStatics = "ProjectileLauncher_projectilesCollideWithStatics",
    ProjectileLauncher_projectileGravity = "ProjectileLauncher_projectileGravity",
    ProjectileLauncher_projectileScale = "ProjectileLauncher_projectileScale",
    ProjectileLauncher_projectileTrailLengthScale = "ProjectileLauncher_projectileTrailLengthScale",
    ProjectileLauncher_projectileColor = "ProjectileLauncher_projectileColor",
    ProjectileLauncher_launchSfx = "ProjectileLauncher_launchSfx",
    ProjectileLauncher_hitPlayerSfx = "ProjectileLauncher_hitPlayerSfx",
    ProjectileLauncher_hitPlayerHeadSfx = "ProjectileLauncher_hitPlayerHeadSfx",
    ProjectileLauncher_hitObjectSfx = "ProjectileLauncher_hitObjectSfx",
    ProjectileLauncher_hitWorldSfx = "ProjectileLauncher_hitWorldSfx",
    SoundFxComponent_pitch = "SoundFxComponent_pitch",
    SoundFxComponent_pitchSemitone = "SoundFxComponent_pitchSemitone",
    SoundFxComponent_minDistance = "SoundFxComponent_minDistance",
    SoundFxComponent_maxDistance = "SoundFxComponent_maxDistance",
    SoundFxComponent_global = "SoundFxComponent_global",
    SoundFxComponent_volumeRandomness = "SoundFxComponent_volumeRandomness",
    SoundFxComponent_pitchRandomness = "SoundFxComponent_pitchRandomness",
    SoundFxComponent_pitchRandomnessSemitone = "SoundFxComponent_pitchRandomnessSemitone",
    SpawnPoint_allowStart = "SpawnPoint_allowStart",
    SpawnPoint_setPositionOnly = "SpawnPoint_setPositionOnly",
    SpawnPoint_allowXZRotation = "SpawnPoint_allowXZRotation",
    SpawnPoint_gravity = "SpawnPoint_gravity",
    SpawnPoint_ownerOnly = "SpawnPoint_ownerOnly",
    SpawnPoint_playerSpeed = "SpawnPoint_playerSpeed",
    SpawnPoint_cameraOverride = "SpawnPoint_cameraOverride",
    SpawnPoint_panCameraOffset = "SpawnPoint_panCameraOffset",
    SpawnPoint_orbitCameraDistance = "SpawnPoint_orbitCameraDistance",
    SpawnPoint_followCameraActivationDelay = "SpawnPoint_followCameraActivationDelay",
    SpawnPoint_followCameraContinuousRotation = "SpawnPoint_followCameraContinuousRotation",
    SpawnPoint_followCameraDistance = "SpawnPoint_followCameraDistance",
    SpawnPoint_followCameraHorizonLevelling = "SpawnPoint_followCameraHorizonLevelling",
    SpawnPoint_followCameraRotationRate = "SpawnPoint_followCameraRotationRate",
    Physics_motion = "Physics_motion",
    PlayerInteraction_grabbableChoice = "PlayerInteraction_grabbableChoice",
    Transform_position = "Transform_position",
    Transform_rotation = "Transform_rotation",
    Transform_scale = "Transform_scale",
    WbEntityName = "wbEntityName",
    ScriptEntityId = "scriptEntityId",
    Visibility_hidden = "Visibility_hidden"
}
export declare enum ScriptingCollisionsType {
    Nothing = 0,
    Players = 1,
    Objects_Tagged = 2,
    Both = 3
}
export declare enum TriggerType {
    Players = 0,
    Objects_Tagged = 1
}
export declare enum ObjectCollisionLayers {
    Everything = 0,
    ObjectsOnly = 1,
    PlayerOnly = 2
}
export declare enum RaycastType {
    Players = 0,
    ObjectsTagged = 1,
    Both = 2
}
export declare enum WBLightType {
    Point = 0,
    Spot = 1
}
export declare enum WBStaticLightType {
    Cuboid = 0,
    Ellipsoid = 1,
    Disk = 2,
    Rectangle = 3
}
export declare enum ProjectilePreset {
    Default = "Default",
    Sphere = "Sphere",
    SphereUnlit = "SphereUnlit",
    Rocket = "Rocket",
    Pistol = "Pistol",
    Grenade = "Grenade"
}
export declare enum ProjectileLauncherCollideWithPlayersType {
    NoPlayers = 0,
    AllExceptOwner = 1,
    AllPlayers = 2
}
export declare enum ProjectileLauncherCollideWithObjectsType {
    NoObjects = 0,
    AllExceptLauncherGroup = 1,
    AllObjects = 2
}
export declare enum MotionType {
    None = 0,
    Animated = 1,
    Interactive = 2
}
export declare enum GrabbableChoice {
    Physics = 0,
    Both = 1,
    Grabbable = 2
}
export declare enum HWXSCameraOverrideVariant {
    None = 0,
    ThirdPerson = 1,
    FirstPerson = 2,
    Orbit = 3,
    Pan = 4,
    Follow = 5
}
export declare enum ParticleFxParticlesFollowGizmoType {
    No_Override = 0,
    Follow = 1,
    Stay = 2
}
export declare enum ScriptExecutionContext {
    Client = 0,
    Server = 1
}
export declare class TrimeshEntity extends EditableEntity {
    toString(): string;
    get tintColor(): ColorValue;
    setTintColor(color: ColorValue): Promise<void>;
    get tintStrength(): number;
    setTintStrength(tintStrength: number): Promise<void>;
    get brightness(): number;
    setBrightness(brightness: number): Promise<void>;
    setTexture(textureAssetId: string, textureAssetVersionId?: string): Promise<void>;
}
export declare class TextEntity extends EditableEntity {
    toString(): string;
    get text(): string;
    setText(text: string): Promise<void>;
    get shouldAutoFit(): boolean;
    setShouldAutoFit(autoFit: boolean): Promise<void>;
    get fixedFontSize(): number;
    setFixedFontSize(size: number): Promise<void>;
    get useOptimisticFont(): boolean;
    setUseOptimisticFont(optimistic: boolean): Promise<void>;
}
export declare class TriggerEntity extends EditableEntity {
    toString(): string;
    get disabled(): boolean;
    setDisabled(disabled: boolean): Promise<void>;
    get triggerType(): TriggerType;
    setTriggerType(type: TriggerType): Promise<void>;
    get objectTag(): string;
    setObjectTag(tag: string): Promise<void>;
    get selectableInScreenMode(): boolean;
    setSelectableInScreenMode(selectable: boolean): Promise<void>;
}
export declare class LightEntity extends EditableEntity {
    toString(): string;
    get enabled(): boolean;
    setEnabled(enabled: boolean): Promise<void>;
    get lightType(): WBLightType;
    setLightType(type: WBLightType): Promise<void>;
    get color(): Color;
    setColor(color: ColorValue): Promise<void>;
    get intensity(): number;
    setIntensity(intensity: number): Promise<void>;
    get falloffDistance(): number;
    setFalloffDistance(distance: number): Promise<void>;
    get spread(): number;
    setSpread(spread: number): Promise<void>;
}
export declare class StaticLightEntity extends EditableEntity {
    toString(): string;
    get enabled(): boolean;
    setEnabled(enabled: boolean): Promise<void>;
    get lightShape(): WBStaticLightType;
    setLightShape(shape: WBStaticLightType): Promise<void>;
    get color(): Color;
    setColor(color: ColorValue): Promise<void>;
    get intensity(): number;
    setIntensity(intensity: number): Promise<void>;
}
export declare class ParticleFxEntity extends EditableEntity {
    toString(): string;
    get playOnStart(): boolean;
    setPlayOnStart(play: boolean): Promise<void>;
    get looping(): boolean;
    setLooping(loop: boolean): Promise<void>;
    get particlesFollowGizmo(): ParticleFxParticlesFollowGizmoType;
    setParticlesFollowGizmo(follow: ParticleFxParticlesFollowGizmoType): Promise<void>;
    get preset(): string;
    setPreset(preset: string): Promise<void>;
}
export declare class TrailFxEntity extends EditableEntity {
    toString(): string;
    get playOnStart(): boolean;
    setPlayOnStart(play: boolean): Promise<void>;
    get trailLength(): number;
    setTrailLength(length: number): Promise<void>;
    get trailWidth(): number;
    setTrailWidth(width: number): Promise<void>;
    get trailStartColor(): Vec3;
    setTrailStartColor(color: Vec3): Promise<void>;
    get trailEndColor(): Vec3;
    setTrailEndColor(color: Vec3): Promise<void>;
    get preset(): string;
    setPreset(preset: string): Promise<void>;
}
export declare class RaycastEntity extends EditableEntity {
    toString(): string;
    get collideWith(): RaycastType;
    setCollideWith(collide: RaycastType): Promise<void>;
    get objectTag(): string;
    setObjectTag(tag: string): Promise<void>;
    get raycastDistance(): number;
    setRaycastDistance(distance: number): Promise<void>;
    get stopOnFirstHit(): boolean;
    setStopOnFirstHit(stop: boolean): Promise<void>;
}
export declare class ProjectileLauncherEntity extends EditableEntity {
    toString(): string;
    get projectilePreset(): ProjectilePreset;
    setProjectilePreset(preset: ProjectilePreset): Promise<void>;
    get projectileSpeed(): number;
    setProjectileSpeed(speed: number): Promise<void>;
    get projectilesCollideWithPlayers(): ProjectileLauncherCollideWithPlayersType;
    setProjectilesCollideWithPlayers(collide: ProjectileLauncherCollideWithPlayersType): Promise<void>;
    get projectilesCollideWithObjects(): ProjectileLauncherCollideWithObjectsType;
    setProjectilesCollideWithObjects(collide: ProjectileLauncherCollideWithObjectsType): Promise<void>;
    get projectilesCollideWithStatics(): boolean;
    setProjectilesCollideWithStatics(collide: boolean): Promise<void>;
    get projectileGravity(): number;
    setProjectileGravity(gravity: number): Promise<void>;
    get projectileScale(): number;
    setProjectileScale(scale: number): Promise<void>;
    get projectileTrailLengthScale(): number;
    setProjectileTrailLengthScale(scale: number): Promise<void>;
    get projectileColor(): Vec3;
    setProjectileColor(color: Color): Promise<void>;
}
export declare class SpawnPointEntity extends EditableEntity {
    toString(): string;
    get allowStart(): boolean;
    setAllowStart(allow: boolean): Promise<void>;
    get setPositionOnly(): boolean;
    setSetPositionOnly(positionOnly: boolean): Promise<void>;
    get allowXZRotation(): boolean;
    setAllowXZRotation(allow: boolean): Promise<void>;
    get gravity(): number;
    setGravity(gravity: number): Promise<void>;
    get ownerOnly(): boolean;
    setOwnerOnly(ownerOnly: boolean): Promise<void>;
    get playerSpeed(): number;
    setPlayerSpeed(speed: number): Promise<void>;
    get cameraOverride(): HWXSCameraOverrideVariant;
    setCameraOverride(override: HWXSCameraOverrideVariant): Promise<void>;
    get panCameraOffset(): Vec3;
    setPanCameraOffset(offset: Vec3): Promise<void>;
    get orbitCameraDistance(): number;
    setOrbitCameraDistance(distance: number): Promise<void>;
    get followCameraActivationDelay(): number;
    setFollowCameraActivationDelay(delay: number): Promise<void>;
    get followCameraContinuousRotation(): boolean;
    setFollowCameraContinuousRotation(continuous: boolean): Promise<void>;
    get followCameraDistance(): number;
    setFollowCameraDistance(distance: number): Promise<void>;
    get followCameraHorizonLevelling(): boolean;
    setFollowCameraHorizonLevelling(levelling: boolean): Promise<void>;
    get followCameraRotationRate(): number;
    setFollowCameraRotationRate(rate: number): Promise<void>;
}
export declare class ScriptEntity extends BaseEditable {
    id: string;
    constructor(id: string);
    toString(): string;
    get scriptExecutionContext(): ScriptExecutionContext;
    setScriptExecutionContext(context: ScriptExecutionContext): Promise<void>;
    get friendlyName(): string;
    setFriendlyName(name: string): Promise<void>;
}
declare type EntityClassType<T extends EditableEntity> = new (id: bigint) => T;
declare type EntityTypeToClass = {
    [EditorEntityType.Text]: TextEntity;
    [EditorEntityType.Trimesh]: TrimeshEntity;
    [EditorEntityType.Trigger]: TriggerEntity;
    [EditorEntityType.StaticLight]: StaticLightEntity;
    [EditorEntityType.Light]: LightEntity;
    [EditorEntityType.ParticleFx]: ParticleFxEntity;
    [EditorEntityType.TrailFx]: TrailFxEntity;
    [EditorEntityType.Raycast]: RaycastEntity;
    [EditorEntityType.ProjectileLauncher]: ProjectileLauncherEntity;
    [EditorEntityType.SpawnPoint]: SpawnPointEntity;
    [EditorEntityType.CustomUIGizmo]: EditableEntity;
    [EditorEntityType.EntityGroup]: EditableEntity;
    [EditorEntityType.AvatarMirror]: EditableEntity;
    [EditorEntityType.SoundFx]: EditableEntity;
    [EditorEntityType.AmbientAudio]: EditableEntity;
    [EditorEntityType.Seat]: EditableEntity;
};
export declare const Editor: EditorAPI;
export {};

}