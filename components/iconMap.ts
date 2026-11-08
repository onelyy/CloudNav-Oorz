/**
 * 图标白名单（2026-11 优化）
 *
 * 原来 Icon.tsx / IconSelector.tsx 用 `import * as LucideIcons from 'lucide-react'`，
 * 会把整个 lucide 图标库打进包（863 KB / gzip 160 KB），对一个导航站来说太重。
 * 这里显式列出常用图标：打包只留用到的（约 1/13），同时保留「按名字取图标」的能力。
 *
 * 想加图标：从 lucide-react import 进来，再加进 ICON_MAP 即可。
 */
import {
  Activity, AlertCircle, Anchor, Aperture, Archive, AtSign, Award, BarChart3,
  Bell, Bike, Book, BookOpen, Bookmark, Bot, Box, Boxes,
  Briefcase, Building2, Calendar, Camera, Car, ChartPie, Check, CheckCircle2,
  CheckSquare, ChevronDown, ChevronUp, Chrome, Circle, ClipboardList, Clock, Cloud,
  CloudCog, CloudRain, CloudSnow, Code, Coffee, Coins, Columns, Compass,
  Copy, Cpu, CreditCard, Crosshair, Database, Download, Edit, Edit2,
  ExternalLink, Facebook, Feather, FileText, Film, Filter, Flag, Flame,
  Folder, Gamepad2, Gift, GitBranch, GitFork, Github, Gitlab, Globe,
  Grid, GripVertical, HardDrive, Hash, Headphones, Heart, Hexagon, Highlighter,
  Home, Image, Inbox, Info, Instagram, Key, Landmark, Layers,
  Layout, LayoutGrid, Library, LineChart, Link, Linkedin, List, Loader2,
  Lock, LogOut, Mail, Map, MapPin, Menu, MessageCircle, MessageSquare,
  Mic, Minus, Monitor, Moon, MoreVertical, Music, Navigation, Notebook,
  Package, Paintbrush, Palette, Pause, PenTool, Percent, Phone, Pin,
  Plane, Play, Plus, Printer, Puzzle, Radar, Receipt, Repeat,
  Rocket, Rss, Save, Scissors, Search, Send, Server, Settings,
  Share, Share2, Shield, Ship, ShoppingCart, Sidebar, Smartphone, Sparkles,
  Square, Star, Store, Sun, Sunrise, Sunset, Tablet, Tag,
  Target, Terminal, Thermometer, ThumbsUp, Timer, Train, Trash, Trash2,
  TrendingUp, Triangle, Truck, Tv, Twitter, Type, Umbrella, Upload,
  User, Users, Video, Volume2, Wallet, Watch, Wifi, Wind,
  Wrench, X, Youtube, Zap,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Activity, AlertCircle, Anchor, Aperture, Archive, AtSign, Award, BarChart3,
  Bell, Bike, Book, BookOpen, Bookmark, Bot, Box, Boxes,
  Briefcase, Building2, Calendar, Camera, Car, ChartPie, Check, CheckCircle2,
  CheckSquare, ChevronDown, ChevronUp, Chrome, Circle, ClipboardList, Clock, Cloud,
  CloudCog, CloudRain, CloudSnow, Code, Coffee, Coins, Columns, Compass,
  Copy, Cpu, CreditCard, Crosshair, Database, Download, Edit, Edit2,
  ExternalLink, Facebook, Feather, FileText, Film, Filter, Flag, Flame,
  Folder, Gamepad2, Gift, GitBranch, GitFork, Github, Gitlab, Globe,
  Grid, GripVertical, HardDrive, Hash, Headphones, Heart, Hexagon, Highlighter,
  Home, Image, Inbox, Info, Instagram, Key, Landmark, Layers,
  Layout, LayoutGrid, Library, LineChart, Link, Linkedin, List, Loader2,
  Lock, LogOut, Mail, Map, MapPin, Menu, MessageCircle, MessageSquare,
  Mic, Minus, Monitor, Moon, MoreVertical, Music, Navigation, Notebook,
  Package, Paintbrush, Palette, Pause, PenTool, Percent, Phone, Pin,
  Plane, Play, Plus, Printer, Puzzle, Radar, Receipt, Repeat,
  Rocket, Rss, Save, Scissors, Search, Send, Server, Settings,
  Share, Share2, Shield, Ship, ShoppingCart, Sidebar, Smartphone, Sparkles,
  Square, Star, Store, Sun, Sunrise, Sunset, Tablet, Tag,
  Target, Terminal, Thermometer, ThumbsUp, Timer, Train, Trash, Trash2,
  TrendingUp, Triangle, Truck, Tv, Twitter, Type, Umbrella, Upload,
  User, Users, Video, Volume2, Wallet, Watch, Wifi, Wind,
  Wrench, X, Youtube, Zap,
};

/** 兼容旧数据里已经存下的图标名 */
const ALIAS: Record<string, string> = {"Firefox":"Compass","Safari":"Compass","Edge":"Globe"};

/**
 * 按名字取图标组件。
 * 优先查白名单，其次查别名，最后回落到 Link。
 */
export const getIcon = (name?: string): LucideIcon =>
  (name && (ICON_MAP[name] || ICON_MAP[ALIAS[name] || ''])) || ICON_MAP.Link;

/** 可直接选用的图标名（IconSelector 用） */
export const ICON_NAMES: string[] = Object.keys(ICON_MAP).sort();

/** 判断名字是否是有效图标（含别名与 kebab-case） */
export const isKnownIcon = (name: string): boolean => {
  if (!name) return false;
  if (name in ICON_MAP || name in ALIAS) return true;
  const pascal = name.replace(/(^|-)([a-z])/g, (_m, _d, c) => c.toUpperCase());
  return pascal in ICON_MAP || pascal in ALIAS;
};
