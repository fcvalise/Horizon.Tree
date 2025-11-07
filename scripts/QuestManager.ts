import { OColor } from '_OColor';
import { OUtils } from '_OUtils';
import { OWings } from '_OWings';
import { OWrapper } from '_OWrapper';
import * as hz from 'horizon/core';
import { Color } from 'horizon/core';

class QuestManager extends hz.Component<typeof QuestManager> {
  static propsDefinition = {
    popupPosition: { type: hz.PropTypes.Vec3, default: new hz.Vec3(0, 10, 0) },
    titleOffset: { type: hz.PropTypes.Vec3, default: new hz.Vec3(0, 10, 0) },
    fontSize: { type: hz.PropTypes.Number, default: 10 },
    titleFontSize: { type: hz.PropTypes.Number, default: 10 },
    charPerLine: { type: hz.PropTypes.Number, default: 10 },
  };

  start() {
    const wrapper = new OWrapper(this);
    const sound = OUtils.getChildWithTag(this.entity, 'Sound')!.as(hz.AudioGizmo);

    wrapper.onPlayerEnter((player) => {
      // console.log('Player enter quest manager');

      // const title = this.getTitle('QuestBeeCount');
      // const titleFont = '<font=roboto-bold sdf><material=roboto-bold sdf>';
      // const text = this.formatParagraph(this.getText('QuestBeeCount'), this.props.charPerLine);
      // const texteFont = '<font=roboto-bold sdf><material=roboto-bold sdf>';

      // const quest = `\n<b>${titleFont}${title}</b>\n\n${texteFont}${text}\n\n`;

      // this.world.ui.showPopupForPlayer(player, quest, 8, {
      //   position: this.props.popupPosition,
      //   fontSize: this.props.fontSize,
      //   fontColor: OColor.Orange,
      //   backgroundColor: Color.white,
      //   playSound: false,
      //   showTimer: false,
      // });


      // player.showInfoSlides([
      //   {
      //     title: this.getTitle('QuestBeeCount'),
      //     message: this.getText('QuestBeeCount'),
      //     // imageUri?: string;
      //     // style?: InfoSlideStyle;
      //   },
      //   {
      //     title: 'Test',
      //     message: 'yo',
      //     // imageUri?: string;
      //     // style?: InfoSlideStyle;
      //   }
      // ])


      const sub = this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnAchievementComplete, (player: hz.Player, scriptID: string) => {
        const title = this.getTitle(scriptID);
        const titleFont = '<font=roboto-bold sdf><material=roboto-bold sdf>';
        const text = this.formatParagraph(this.getText(scriptID), this.props.charPerLine);
        const texteFont = '<font=roboto-bold sdf><material=roboto-bold sdf>';

        const quest = `\n<b>${titleFont}${title}</b>\n\n${texteFont}${text}\n\n`;

        this.world.ui.showPopupForPlayer(player, quest, 5, {
          position: this.props.popupPosition,
          fontSize: this.props.fontSize,
          fontColor: OColor.Orange,
          backgroundColor: Color.white,
          playSound: false,
          showTimer: false,
        });
        sound.play({ fade: 1, players: [player] });
      });
    })
  }

  private getTitle(scriptID: string): string {
    if (scriptID == 'QuestBuildHive')
      return 'First hive built';
    if (scriptID == 'QuestExpandTerrain')
      return 'Island expanded';
    if (scriptID == 'QuestBeeCount')
      return 'First bee recruited';
    if (scriptID == 'QuestHoney')
      return '200 honey collected';
    if (scriptID == 'QuestRain')
      return 'Rain unlocked';
    return 'MISSING TITLE';
  }

  private getText(scriptID: string): string {
    if (scriptID == 'QuestBuildHive')
      return 'Your first hive is complete!';// \n\n the colony finally has a home!';
    if (scriptID == 'QuestExpandTerrain')
      return 'You’ve expanded your island';// \n\n new land is ready to flourish!';
    if (scriptID == 'QuestBeeCount')
      return 'Your first worker bee joins the colony';// \n\n let the harvest begin!';
    if (scriptID == 'QuestHoney')
      return 'You’ve gathered 200 honey';// \n\n proof of a thriving hive!';
    if (scriptID == 'QuestRain')
      return 'Rain returns to your island';// \n\n flowers bloom once more!';
    return 'MISSING DESCRIPTION';
  }

  private getTextDescription(scriptID: string): string {
    if (scriptID == 'QuestBuildHive')
      return 'Construct your very first hive and give your colony a home. Bees need a heart to return to.'
    if (scriptID == 'QuestExpandTerrain')
      return 'Grow your island! Expand thirty terrain tiles to unlock new fertile areas for flowers and hives.'
    if (scriptID == 'QuestBeeCount')
      return 'Strengthen your swarm. Recruit or hatch ten bees to increase your colony’s harvesting power.'
    if (scriptID == 'QuestHoney')
      return 'Store up a sweet reserve of honey. True prosperity begins with a full hive.'
    if (scriptID == 'QuestRain')
      return 'Call down rain twenty times to revive the flowers. Let the world bloom again beneath your clouds.'
    return 'missing';
  }

  public formatParagraph(text: string, maxLineLength: number = 40): string {
    const nobreakBefore = [';', ':', ')', '»']; // removed '?' and '!'
    const nobreakAfter = ['(', '«'];

    text = text.replace(/ ?([;:»])/g, '\u00A0$1');
    text = text.replace(/([«(]) ?/g, '$1\u00A0');
    text = text.replace(/[\u00A0 ]+([.!?])/g, '$1');

    const words = text.split(/\s+/);
    let lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const potentialLine = currentLine.length > 0 ? currentLine + ' ' + word : word;
      const lastWord = currentLine.split(' ').pop() || '';
      if ((nobreakBefore.includes(word[0]) && currentLine.length > 0) ||
        (nobreakAfter.includes(lastWord) && currentLine.length > 0)) {
        currentLine += '\u00A0' + word;
      } else if (potentialLine.length <= maxLineLength) {
        currentLine = potentialLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine.length > 0) lines.push(currentLine);
    return lines.join('\n');
  }
}
hz.Component.register(QuestManager);