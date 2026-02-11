import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../database";

interface StoryAttributes {
  id: number;
  hnId: number;
  title: string;
  url: string | null;
  text: string | null;
  by: string;
  score: number;
  time: number;
  descendants: number;
  coreIdea: string | null;
  concepts: string[] | null;
  technologies: string[] | null;
  entities: string[] | null;
  communityAngle: string | null;
  sentiment: string | null;
  sentimentScore: number | null;
  controversyPotential: string | null;
  intellectualDepth: string | null;
  analysisVersion: string | null;
  embedded: boolean;
  processedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface StoryCreationAttributes extends Optional<StoryAttributes, "id" | "coreIdea" | "concepts" | "technologies" | "entities" | "communityAngle" | "sentiment" | "sentimentScore" | "controversyPotential" | "intellectualDepth" | "analysisVersion" | "embedded" | "processedAt"> {}

class Story extends Model<StoryAttributes, StoryCreationAttributes> implements StoryAttributes {
  declare id: number;
  declare hnId: number;
  declare title: string;
  declare url: string | null;
  declare text: string | null;
  declare by: string;
  declare score: number;
  declare time: number;
  declare descendants: number;
  declare coreIdea: string | null;
  declare concepts: string[] | null;
  declare technologies: string[] | null;
  declare entities: string[] | null;
  declare communityAngle: string | null;
  declare sentiment: string | null;
  declare sentimentScore: number | null;
  declare controversyPotential: string | null;
  declare intellectualDepth: string | null;
  declare analysisVersion: string | null;
  declare embedded: boolean;
  declare processedAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Story.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    hnId: {
      type: DataTypes.INTEGER,
      unique: true,
      allowNull: false,
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    by: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    score: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    time: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    descendants: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    coreIdea: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    concepts: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    technologies: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    entities: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    communityAngle: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sentiment: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sentimentScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    controversyPotential: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    intellectualDepth: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    analysisVersion: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    embedded: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "stories",
    indexes: [
      { fields: ["hnId"], unique: true },
      { fields: ["time"] },
      { fields: ["embedded"] },
      { fields: ["sentiment"] },
    ],
  }
);

export default Story;
