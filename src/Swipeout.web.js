import React, { PropTypes } from 'react';
import Hammer from 'react-hammerjs';
import omit from 'object.omit';
import splitObject from './util/splitObject';

class Swipeout extends React.Component {
  static propTypes = {
    prefixCls: PropTypes.string,
    autoClose: PropTypes.bool,
    disabled: PropTypes.bool,
    left: PropTypes.arrayOf(PropTypes.object),
    right: PropTypes.arrayOf(PropTypes.object),
    onOpen: PropTypes.func,
    onClose: PropTypes.func,
    children: PropTypes.any,
  };

  static defaultProps = {
    prefixCls: 'rc-swipeout',
    autoClose: false,
    disabled: false,
    left: [],
    right: [],
    onOpen() {},
    onClose() {},
  };

  constructor(props) {
    super(props);

    this.onPanStart = this.onPanStart.bind(this);
    this.onPan = this.onPan.bind(this);
    this.onPanEnd = this.onPanEnd.bind(this);
    this.onTap = this.onTap.bind(this);

    this.openedLeft = false;
    this.openedRight = false;
    this.disabledPan = false;
  }

  componentDidMount() {
    const { left, right } = this.props;
    const width = this.refs.content.offsetWidth;

    this.contentWidth = width;
    this.btnsLeftWidth = left ? (width / 5) * left.length : 0;
    this.btnsRightWidth = right ? (width / 5) * right.length : 0;
  }

  onPanStart(e) {
    // cannot set direction by react-harmmerjs, fix left & right direction temporarily
    // wait react-harmmerjs pr #46 to merge
    const { left, right } = this.props;
    const aev = e.additionalEvent;
    if (aev === 'panright' && !left.length) {
      this.disabledPan = true;
    } else if (aev === 'panleft' && !right.length) {
      this.disabledPan = true;
    } else {
      this.disabledPan = false;
    }

    if (this.props.disabled || this.disabledPan) {
      return;
    }
    this.panStartX = e.deltaX;
  }

  onPan(e) {
    if (this.props.disabled || this.disabledPan) {
      return;
    }

    // get pan distance
    let posX = e.deltaX - this.panStartX;
    if (this.openedRight) {
      posX = posX - this.btnsRightWidth;
    } else if (this.openedLeft) {
      posX = posX + this.btnsLeftWidth;
    }

    if (posX < 0 && this.props.right) {
      this._setStyle(Math.min(posX, 0));
    } else if (posX > 0 && this.props.left) {
      this._setStyle(Math.max(posX, 0));
    }
  }

  onPanEnd(e) {
    if (this.props.disabled || this.disabledPan) {
      return;
    }

    const posX = e.deltaX - this.panStartX;
    const contentWidth = this.contentWidth;
    const btnsLeftWidth = this.btnsLeftWidth;
    const btnsRightWidth = this.btnsRightWidth;
    const openX = contentWidth * 0.33;
    let openLeft = posX > openX || posX > btnsLeftWidth / 2;
    let openRight = posX < -openX || posX < -btnsRightWidth / 2;

    if (this.openedRight) {
      openRight = posX - openX < -openX;
    }
    if (this.openedLeft) {
      openLeft = posX + openX > openX;
    }

    if (openRight && posX < 0) {
      this.open(-btnsRightWidth, false, true);
    } else if (openLeft && posX > 0) {
      this.open(btnsLeftWidth, true, false);
    } else {
      this.close();
    }
  }

  onTap() {
    if (this.openedLeft || this.openedRight) {
      this.close();
    }
  }

  // left & right button click
  onBtnClick(btn) {
    const onPress = btn.onPress;
    if (onPress) {
      onPress();
    }
    if (this.props.autoClose) {
      this.close();
    }
  }

  _getContentEasing(value, limit) {
    // limit content style left when value > actions width
    if (value < 0 && value < limit) {
      return limit - Math.pow(limit - value, 0.85);
    } else if (value > 0 && value > limit) {
      return limit + Math.pow(value - limit, 0.85);
    }
    return value;
  }

  // set content & actions style
  _setStyle(value) {
    const { left, right } = this.props;
    const limit = value > 0 ? this.btnsLeftWidth : -this.btnsRightWidth;
    const contentLeft = this._getContentEasing(value, limit);
    this.refs.content.style.left = `${contentLeft}px`;
    if (left.length) {
      const leftWidth = Math.max(Math.min(value, Math.abs(limit)), 0);
      this.refs.left.style.width = `${leftWidth}px`;
    }
    if (right.length) {
      const rightWidth = Math.max(Math.min(-value, Math.abs(limit)), 0);
      this.refs.right.style.width = `${rightWidth}px`;
    }
  }

  open(value, openedLeft, openedRight) {
    const onOpen = this.props.onOpen;
    if (onOpen && !this.openedLeft && !this.openedRight) {
      onOpen();
    }

    this.openedLeft = openedLeft;
    this.openedRight = openedRight;
    this._setStyle(value);
  }

  close() {
    const onClose = this.props.onClose;
    if (onClose && (this.openedLeft || this.openedRight)) {
      onClose();
    }
    this.openedLeft = false;
    this.openedRight = false;
    this._setStyle(0);
  }

  renderButtons(buttons, ref) {
    const prefixCls = this.props.prefixCls;

    return (buttons && buttons.length) ? (
      <div className={`${prefixCls}-actions ${prefixCls}-actions-${ref}`} ref={ref}>
        {buttons.map((btn, i) => {
          return (
            <div key={i}
              className={`${prefixCls}-btn`}
              style={btn.style}
              onClick={() => this.onBtnClick(btn)}
            >
              <div className={`${prefixCls}-text`}>{btn.text || 'Click'}</div>
            </div>
          );
        })}
      </div>
    ) : null;
  }

  render() {
    const [{ prefixCls, left, right, children }, restProps] = splitObject(
      this.props,
      ['prefixCls', 'left', 'right', 'children']
    );
    const divProps = omit(restProps, [
      'disabled',
      'autoClose',
      'onOpen',
      'onClose',
    ]);

    let direction = 'DIRECTION_HORIZONTAL';
    if (left.length && right.length === 0) {
      direction = 'DIRECTION_RIGHT';
    }
    if (right.length && left.length === 0) {
      direction = 'DIRECTION_LEFT';
    }
    return (left.length || right.length) ? (
      <div className={`${prefixCls}`} {...divProps}>
        <Hammer
          direction={direction}
          onPanStart={this.onPanStart}
          onPan={this.onPan}
          onPanEnd={this.onPanEnd}
          onTap={this.onTap}
        >
          <div className={`${prefixCls}-content`} ref="content">
            {children}
          </div>
        </Hammer>

        { this.renderButtons(left, 'left') }
        { this.renderButtons(right, 'right') }
      </div>
    ) : (
      <div ref="content" {...divProps}>{children}</div>
    );
  }
}

export default Swipeout;
