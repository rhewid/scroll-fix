# Scroll Fix

A client mod for [Ragnarok Offline](https://github.com/Flux159/ragnarokoffline.app). It fixes mouse-wheel scrolling in NPC shop and sell windows, where one turn of the wheel flies to the end of the list.

## Why it happens

The client scrolls a fixed step on every wheel *event*. A smooth or free-spinning wheel, or a touchpad, sends many events per notch, so the list runs far past where you wanted. In shop windows the client also has two scroll handlers on the same list.

## What the mod does

It catches the wheel before the client's handlers, adds the movement up, and scrolls **one step per notch** of movement. In shop windows it snaps to whole rows, so the list never stops half way through an item.

While a shop window is open, the mod also swallows wheel turns that are not over a list. Otherwise the client zooms the game camera, which shifted the screen up and showed black below. Camera zoom works as usual once the shop is closed.

## Settings (Settings → Mods)

| Setting | Default | |
|---|---|---|
| Rows per wheel notch | 1 | Rows scrolled per notch (a row is 32 px). |
| Wheel notch size | 100 | Wheel movement that counts as one notch. Raise it if a smooth wheel or touchpad is still too fast, lower it if scrolling feels sluggish. |
| Fix every scrolling list | on | Also inventory, storage and other lists with the custom scrollbar. Off = only shop windows. |

Changes apply when the game page reloads (Apply, then restart the client).

## Install

Copy the `scroll-fix` folder to `%APPDATA%\Ragnarok Offline\state\mods`, or use Settings → Mods → Add mod from folder. Needs app >= 1.4.5.
