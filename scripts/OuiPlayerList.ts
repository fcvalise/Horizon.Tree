import { CodeBlockEvent, CodeBlockEvents, Player, PlayerDeviceType, PropTypes, SerializableState, TextureAsset } from 'horizon/core';
import { AvatarImageExpressions, Binding, DynamicList, Image, ImageSource, Text, UIComponent, UINode, View } from 'horizon/ui';

type PlayerData = {
  image?: ImageSource,
  name?: string,
  afk?: boolean,
}

class OuiPlayerList extends UIComponent<typeof OuiPlayerList> {
  protected panelHeight: number = 300;
  protected panelWidth: number = 500;

  static propsDefinition = {
    index: { type: PropTypes.Number },
    dynamicOwnership: { type: PropTypes.Boolean },
  };

  private afkPlayers: Set<Player> = new Set();
  private players: Binding<PlayerData[]> = new Binding<PlayerData[]>([]);

  refresh() {
    // make sure the owner match our index
    if (this.props.dynamicOwnership)
    {
      const owner = this.world.getPlayerFromIndex(this.props.index);
      if(owner && owner.deviceType.get() !== PlayerDeviceType.VR && this.entity.owner.get() != owner)
      {
        this.entity.owner.set(owner);
        return;
      }
      else if (!owner)
      {
        this.entity.owner.set(this.world.getServerPlayer())
        return;
      }
    }
    if (this.entity.owner.get().deviceType.get() === PlayerDeviceType.VR)
      return;

    // update data
    const data : PlayerData[] = [];
    for (const player of this.world.getPlayers())
    {
      const playerData : PlayerData = {
        afk : this.afkPlayers.has(player),
        image:  ImageSource.fromPlayerAvatarExpression(player, AvatarImageExpressions.Neutral),
        name: player.name.get(),
      };
      data.push(playerData);
    }
    this.players.set(data);
  }

  start(): void {
    this.connectCodeBlockEvent(this.entity, CodeBlockEvents.OnPlayerEnterWorld, (_) => this.refresh());
    this.connectCodeBlockEvent(this.entity, CodeBlockEvents.OnPlayerExitWorld, (_) => this.refresh());
    this.connectCodeBlockEvent(this.entity, CodeBlockEvents.OnPlayerEnterAFK, (player) => {this.afkPlayers.add(player); this.refresh();});
    this.connectCodeBlockEvent(this.entity, CodeBlockEvents.OnPlayerExitAFK, (player) => {this.afkPlayers.delete(player); this.refresh();});
  }

  override receiveOwnership(_serializableState: SerializableState, _oldOwner: Player, _newOwner: Player): void {
    this.refresh();
    this.async.setInterval(() => this.refresh, 1500);
  }

  private background = ImageSource.fromTextureAsset(new TextureAsset(BigInt("808872294853242")));

  private PlayerDisplay(playerItem: PlayerData, index?: number): UINode {
    const scale = 0.65;
    return View({
      children: [
        // Image({
        //   source: this.background,
        //   style: {
        //     width: 311 * scale,
        //     height: 80 * scale,
        //     position: "absolute",
        //     opacity: 0.9,
        //   }
        // }),
        View({
          children: Image({
            source: playerItem.image ?? null,
            style: { width: "100%", height: "100%" }
          }),
          style: {
            width: 60 * scale,
            height: 60 * scale,
            marginLeft: (85 - 60) * scale * 0.5,
            alignSelf: 'center',
            overflow: "hidden",
            borderRadius: 50,
            gradientColorA: "#6dafd8",
            gradientColorB: "#c4bce5",
            //marginTop : -0.5 * scale,
            zIndex: 1,
          }
        }),
        Text(
          {
            text: playerItem.name ?? "",
            style: {
              fontFamily: 'Optimistic',
              fontWeight: '900',
              color: "#52200f",
              padding: 5 * scale,
              fontSize: 13,
              textAlign: 'center',
              alignSelf: 'center',
              width: (311 - 80 - 10) * scale,
            }
          })],
      style: {
        width: 311 * scale,
        height: 80 * scale,
        left: 50,
        flexDirection: 'row',
        alignContent: "center",
        marginBottom: -10 * scale,
        opacity : playerItem.afk ? 0.5 : undefined,
      }
    });
  }


  initializeUI(): UINode {
    // Return a UINode to specify the contents of your UI.
    // For more details and examples go to:
    // https://developers.meta.com/horizon-worlds/learn/documentation/typescript/api-references-and-examples/custom-ui
    /*
        const children: UINode[] = []
        for (let i = 0; i < 4; ++i) {
          children.push(this.PlayerDisplay(i));
        }*/
    return View({
      children: DynamicList({
        data: this.players,
        renderItem: (data, index) => this.PlayerDisplay(data, index),
      }),
      style: {
        flexDirection: 'column',
        top: "15%",
        left: 10,
        height: this.panelHeight,
        width: this.panelWidth,
      }
    });
  }
}
UIComponent.register(OuiPlayerList);
