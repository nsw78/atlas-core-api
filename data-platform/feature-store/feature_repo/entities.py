from feast import Entity, ValueType

entity = Entity(name="entity_id", value_type=ValueType.STRING, description="Monitored entity ID", join_keys=["entity_id"])
country = Entity(name="country_code", value_type=ValueType.STRING, description="ISO country code", join_keys=["country_code"])
organization = Entity(name="org_id", value_type=ValueType.STRING, description="Organization ID", join_keys=["org_id"])
